---
layout: post
title: Monkey Patching in Go

---

Many people think that monkey patching is something that is restricted to dynamic languages like Ruby and Python. That is not true however, as computers are just dumb machines and we can always make them do what we want! Let's look at how Go functions work and how we can modify them at runtime. This article will use a lot of Intel assembly syntax, so I'm assuming you can read it already or are using a [reference](https://software.intel.com/en-us/articles/introduction-to-x64-assembly) while reading.

**If you're not interested in how it works and you just want to do monkey patching, then you can find the library [here](https://github.com/bouk/monkey).**

<small>note: samples should be built with `go build -gcflags=-l` to disable inlining. For this article I assume your architecture is 64-bits and that you're using a unix-based operating system like Mac OSX or a Linux variant</small>

Let's look at how the following code looks when disassembled:

<script src="https://gist.github.com/bouk/17262666fae75dd24a25.js"></script>

When compiled and looked at through [Hopper](http://hopperapp.com/), the above code will produce this assembly:

<img src="https://monosnap.com/image/9YuCc2avXnkWhkPQpyvv8blrhSeoDD.png" width="566" />

I will be referring to the addresses of the various instructions displayed on the left side of the screen.

Our code starts in procedure `main.main`, where instructions `0x2010` to `0x2026` set up the stack. You can read more about that [here](http://dave.cheney.net/2013/06/02/why-is-a-goroutines-stack-infinite), I will be ignoring that code for the rest of the article.

Line `0x202a` is the call to function `main.a` at line `0x2000` which simply moves `0x1` onto the stack and returns. Lines `0x202f` to `0x2037` then pass that value on to `runtime.printint`.

Simple enough! Now let's take a look at how function values are implemented in Go.

## How function values work in Go

Consider the following code:

<script src="https://gist.github.com/bouk/c921c3627ddbaae05356.js"></script>

What I'm doing on line 11 is assigning `a` to `f`, which means that doing `f()` will now call `a`. Then I use the [unsafe](http://golang.org/pkg/unsafe/) Go package to directly read out the value stored in `f`. If you come from a C background you might expect `f` to simply be a function pointer to `a` and thus this code to print out `0x2000` (the location of `main.a` as we saw above). When I run this on my machine I get `0x102c38`, which is an address not even close to our code! When disassembled, this is what happens on line 11 above:

<img src="https://monosnap.com/image/rlXiQvaQVt018lDDKahQXgSNK0W1vM.png" width="488" />

This references something called `main.a.f`, and when we look at that location, we see this:

<img src="https://monosnap.com/image/djPms4Lvx16Y7d3yocvuldCWiseZpK.png" width="398" />

Aha! `main.a.f` is at `0x102c38` and contains `0x2000`, which is the location of `main.a`. It seems `f` isn't a pointer to a function, but a pointer to a pointer to a function. Let's modify the code to compensate for that.

<script src="https://gist.github.com/bouk/c470c4d80ae80d7b30af.js"></script>

This will now print `0x2000`, as expected. We can find a clue as to why this is implemented as it is [here](https://github.com/golang/go/blob/e9d9d0befc634f6e9f906b5ef7476fbd7ebd25e3/src/runtime/runtime2.go#L75-L78). Go function values can contain extra information, which is how closures and bound instance methods are implemented.

Let's look at how calling a function value works. I'll change the code to call `f` after assigning it.

<script src="https://gist.github.com/bouk/58bba533fb3b742ed964.js"></script>

When we disassemble this we get the following:

<img src="https://monosnap.com/image/fIGwJMjcvl7chLtQ0xuw7F9jEnop1I.png" width="442" />

`main.a.f` gets loaded into `rdx`, then whatever `rdx` points at gets loaded into `rbx`, which then gets called. The address of the function value always gets loaded into `rdx`, which the code being called can use to load any extra information it might need. This extra information is a pointer to the instance for a bound instance method and the closure for an anonymous function. I advise you to take out a disassembler and dive deeper if you want to know more!

Let's use our newly gained knowledge to implement monkeypatching in Go.

## Replacing a function at runtime

What we want to achieve is to have the following code print out `2`:

<script src="https://gist.github.com/bouk/713f3df2115e1b5e554d.js"></script>

Now how do we implement `replace`? We need to modify function `a` to jump to `b`'s code instead of executing its own body. Essentialy, we need to replace it with this, which loads the function value of `b` into `rdx` and then jumps to the location pointed to by `rdx`.

<script src="https://gist.github.com/bouk/e886664740906bfffd76.js"></script>

I've put the corresponding machine code that those lines generate when assembled next to it (you can easily play around with assembly using an online assembler like [this](https://defuse.ca/online-x86-assembler.htm)). Writing a function that will generate this code is now straightforward, and looks like this:

<script src="https://gist.github.com/bouk/4ed563abdcd06fc45fa0.js"></script>

We now have everything we need to replace `a`'s function body with a jump to `b`! The following code attempts to copy the machine code directly to the location of the function body.

<script src="https://gist.github.com/bouk/305264604c38a8815def.js"></script>

Running this code does not work however, and will result in a segmentation fault. This is because the loaded binary [is not writable by default](https://en.wikipedia.org/wiki/Segmentation_fault#Writing_to_read-only_memory). We can use the `mprotect` syscall to disable this protection, and this final version of the code does exactly that, resulting in function `a` being replaced by function `b`, and '2' being printed.

<script src="https://gist.github.com/bouk/55900e1d964099368ab0.js"></script>

## Wrapping it up in a nice library

I took the above code and [put it in an easy to use library](https://github.com/bouk/monkey). It supports 32 bit, reversing patches, and patching instance methods. I wrote a couple of examples and put those in the README.

## Conclusion

Where there's a will there's a way! It's possible for a program to modify itself at runtime, which allows us to implement cool tricks like monkey patching.

I hope you got something useful out of this blogpost, I know I had fun making it!

Shoot me an [email](mailto:boukevanderbijl@gmail.com) or [tweet](https://twitter.com/BvdBijl) at me with any comments you have.

[Hacker News](https://news.ycombinator.com/item?id=9290917)

[Reddit](https://www.reddit.com/r/golang/comments/30try1/monkey_patching_in_go/)
