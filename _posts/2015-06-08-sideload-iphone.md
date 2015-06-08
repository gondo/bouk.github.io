---
layout: post
title: How to sideload apps on your iPhone using Xcode 7

--- 

Apple just [released the Xcode 7 Beta](https://developer.apple.com/xcode/), and one of the new features is that anyone can now load apps onto their device without having to be a member of the developer program. I'm going to demonstrate how to do this using [GBA4iOS](https://bitbucket.org/rileytestut/gba4ios).

1. [Download and install the Xcode 7 beta](https://developer.apple.com/xcode/downloads/)
2. Open Xcode 7, open preferences and login to your Apple Account. ![](https://monosnap.com/image/LHWIw08QfN4DhVXfo4uAPg1AG6ORGb.png)
3. Download the source code of the app you want to install and follow any setup instructions. (`sudo gem install cocoapods; git clone https://bitbucket.org/rileytestut/gba4ios.git; cd gba4ios; pod install` for GBA4iOS). Open the workspace or project in Xcode.
4. Plug in your iPhone and select it as the build destination. ![](https://monosnap.com/image/x52sXmKKYKu2nyPuOy89z2P4X4tris.png)
5. We now need to generate a code signing signature for the app. Click on the project on the left, fill in a unique "Bundle Identifier" and click on "Fix Issue" (make sure your name is selected as "team") ![](https://monosnap.com/image/tPx4KY779FtuD1YkkfuiZn5vYNPiMU.png)
6. Click the play button in the top left. If there's no build errors the app should now launch on your phone!

[Follow me on Twitter](https://twitter.com/BvdBijl)