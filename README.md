# web-videochat
A WebRTC Video chat application with included file sharing.

## Dependencies
- node js (https://nodejs.org/)

## Installation

### Server

go to the **server** folder, and run the following commands:
- install dependencies via : npm install
- you can edit the config.js to fit with your environment if needed

##### Note:
This server comes with a sample unsigned certificate to load as https since it's required for UserMedia, so I strongly suggest you generate your own certificate and sign it using your favorite certificate signing authority.
If you wish to generate your own unsigned certificate, you can execute the following instructions (Linux/OSX):

**Generating the private key**:

openssl genrsa -des3 -out certificates/ca.key 1024

**Generating the CSR (certificate signing request):**

openssl req -new -key certificates/ca.key -out server.csr

**Generating the self signed certificate:**

openssl x509 -req -days 365 -in server.csr -signkey certificates/ca.key -out certificates/ca.crt


### Client

go to the **client** folder and run the following command:
- install dependencies via : npm install


## Launching

Once all the dependencies are installed head over to the **server** folder and launch it via: node main.js

once the server is running, head over to [https://localhost:8080/](https://localhost:8080/) with the browser of your choice (Chrome or Firefox are recommended).
