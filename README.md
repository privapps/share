### What
A pure static javascript running in a browser that can chat and share files between **two** devices within the **same network**.

Under the neath, it uses  a public [Piping server](https://github.com/nwtgck/piping-server) to do the handshake (signal server), and WebRTC when chatting or file transfer.

### Why
A lot of time I need to transfer files between computers or phones. However, not all devices have BlueTooth, USB cables may not be available, nor always possible to run your local web server, e.g. `python3 -m HTTP.server 8080`. While using email or instant messages that go through some third-party servers is not ideal too.

### Demo
[Live Demo Site](https://privapps.github.io/share/)


### Usage
1. Use the same piping server and secret. The default secret is your public IP address but can be anything.
2. With your two devices, one as an initiator and one as a responder. In many cases, you might switch it around to get it to work. see below.
3. After connecting, those two devices can chat with each other, or transfer files. All those communications are within a local network and have nothing to do with any server (WebRTC)

### Tips
- Make sure the piping server and shared secrets are the same
- May need to swap the initiator and the responder to get it to work. It is a mystery which device should be the initiator/responder; My experience is that is related to your devices, e.g. firewall/network card, etc. rather than your browsers. According to my tests, it works for most cases.
- You can open debug tab to see how the handshake is happening.
- Due to the nature of WebRTC, if devices are in a different network, e.g. under a different router, using a virtual machine, etc. devices' information can be exchanged (using public piping server), but the WebRTC connection may not be initialized.
- You can open the debug tab to see the initial handshake.



### Features
* chat
* file transfer


### Archetecture / Diagrams
![Diagram] (./diagram.jpg)

### Credit
* [piping server](https://github.com/nwtgck/piping-server)
* [serverless-webrtc](https://github.com/svarunan/serverless-webrtc)
* [WebRTC IPs](https://github.com/diafygi/webrtc-ips)
* [picnic css](https://github.com/franciscop/picnic)

### Alternative 
* [ShareDrop](https://github.com/szimek/sharedrop)

### Contribute
Raise PR if have improvements.
