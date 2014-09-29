---
layout: post
title: Idiomatic Generics in Go

---

Go has a fantastic standard library and powerful concurrency primitives, but the type system is notoriously lacking. One of the main features that is sorely missing is generics. In this post I'll compare different methods of implementing generics in Go, and show you what crazy hoops I jumped through to arrive at something that resembles generics in other languages.


## Copy and Paste

A combination of interfaces and good ol' copy and paste is the way Go [currently implements sortable slices](http://golang.org/src/pkg/sort/sort.go?s=5371:5390#L223). This is of course a terrible, terrible idea. The names of your types will end up being `StringSet`, `IntSet`, and `FloatSet`. When you find a bug you'll be forced to go through all of the instances where you copied and pasted, fix it and hope you don't miss any. This is clearly not a sustainable way to 'implement' generics.

## Reflection

A commonly suggested way to implement higher-order functions such as Map/Reduce/Filter is to use reflection, and you'll end up with something like this:

<script src="https://gist.github.com/bouk/fbf273835d996c9f072e.js"></script>

This will give you lots of flexibility, at the cost of static type checking. Losing static type checking will force you to do type checking at runtime, which has a big performance impact and you will lose many of the guarantees a type system gives you. The code is also way harder to understand because of the `interface{}` types everywhere.

## Templating

It would be ideal if we could just write Go like this:

<script src="https://gist.github.com/bouk/c66f38b49aafa2aa02ba.js"></script>

I've implemented a program that does exactly this. It parses the file, traverses the AST and replaces any reference to the type variable `T` with the passed type.

<script src="https://gist.github.com/bouk/4682082a23df8305c73c.js"></script>

This approach has been taken by other projects such as [gengen](https://github.com/joeshaw/gengen), the issue however is that this is still a pain to use. You will have to manage the correctly typed files yourself, while also juggling packaging issues (as multiple versions of the same template will share a namespace). We need something a bit more powerful.

## Go-ing beyond templating: gonerics.io

To fix this issue I've created a service called gonerics.io, which delivers easily usable generics as a service (GAAS). Using gonerics.io is as simple as `go get`ting the appropriate package. For example: `go get gonerics.io/d/set/string.git`. You can then use it as follows:

<script src="https://gist.github.com/bouk/e5e8010f552717e1bcc9.js"></script>

This will print `true false`, as you would expect. The code is also super readable, as you don't have to do any crazy casting or reflection. Converting this to a program that uses ints is as easy as changing the import, like follows:

<script src="https://gist.github.com/bouk/b4e0ac1dc3bd39b2210d.js"></script>

After running `go get gonerics.io/d/set/int.git` and compiling, this will also print `true false`. This makes generics super easy to use!

## Let's go-get functional

This is not where it stops of course. I've also implemented the above mentioned Map/Reduce and Filter using gonerics. The template can be found [here](https://gist.github.com/bouk/9850cdb187cbbd192463). If we now do `go get gonerics.io/f/functional/int.git` we will have access to a bunch of powerful functions, that are also typesafe! For example:

<script src="https://gist.github.com/bouk/fdd2b8adfd6e307c8850.js"></script>

When we run this we get the following output:

`[2 4 6 8 10 12 14 16 18 20 22 24]`

`[13 25 37 49 61 73]`

`[1 4 9 16 25 36 49 64 81 100 121 144]`

I've also added support for templates with multiple arguments, so we can do something like this:

<script src="https://gist.github.com/bouk/8bc549237b337c0761d8.js"></script>

Which will print `16` when executed.

<img src="http://i.imgur.com/fWBwbPP.png" style="float:right; height:150px;"/>

## We have to Go deeper

The fact that goneric templates are go-gettable opens up some interesting possibilities. Take this simple template for a directed graph datastructure for example:

<script src="https://gist.github.com/bouk/de34a0036f39cf5647bb.js"></script>

We can then use it as follows:

<script src="https://gist.github.com/bouk/9a64df0ce733ee8c4590.js"></script>

Because `go get` recursively fetches dependencies I can simply refer to another goneric template inside my template and achieve code reusability through generics!

## Trying it out yourself

Gonerics.io supports custom templates, to use them simply create a gist of your template (like the above [set template](https://gist.github.com/bouk/c66f38b49aafa2aa02ba) for example). You can then import it using a URL like the following (the gist ID is without your Github username):

`gonerics.io/g/<gist id>/<type arguments seperated by _>.git`

The package will then be available under the name of file minus ".go". Your gist should have only a single file, with the .go extension. There probably won't be any useful error message when you make a mistake because I haven't implemented any. The type arguments are accessible under T, U, V etc.

## How does this work?!

Through the magic of CGI and shell scripting! In [my Nginx config](https://github.com/bouk/gonerics/blob/master/nginx-config) I use a [shell script](https://github.com/bouk/gonerics/blob/master/cgi.sh) as the CGI program to use. When git request the repository, this script will check if the specific combination of template and arguments has been served before. If it hasn't, it will first generate the correct file and check it into a new git repo. Finally, it'll call [git-http-backed](http://git-scm.com/docs/git-http-backend) which will actually serve the http request.

The rest of the (rough) code that powers gonerics.io can be found here: [github.com/bouk/gonerics](https://github.com/bouk/gonerics). Don't use gonerics.io for anything important please. It's meant as a proof of concept.

## The future of generics in Go

Go should have proper support for generics so these shenanigans aren't necessary. Rob Pike has recently suggested a new command for the `go` tool called `go generate` with the intention to also [support a simple form of templating](https://docs.google.com/document/d/1V03LUfjSADDooDMhe-_K59EgpTEm3V8uvQRuNMAEnjg/edit#heading=h.i81x19ol3oyz). Looking over the design document, I feel like it would not solve the generics problem at all (although that isn't really what they set out to do). Go would greatly benefit from a proper generics system, and I think it's way overdue.

I'd love to get feedback on this blogpost, feel free to [tweet at](https://twitter.com/BvdBijl) or [email me](mailto:boukevanderbijl@gmail.com).
