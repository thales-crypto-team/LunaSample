# How to use the Luna HSM/DPoD Client with node.js

Interfacing with the Luna HSM and Luna DPoD requires a package called [PKCS11js](https://github.com/PeculiarVentures/pkcs11js).  Please familiarize yourself with the file index.d.ts to see a complete Javascript/Typescript API definition.  A discussion of the full API is not presented here as we do not own it but index.d.ts is maintained by the pkcs11js author(s) and thus one should refer to it for deficiencies and incompleteness in the use of the API here.

[Graphene](https://github.com/PeculiarVentures/graphene), also provides a simplistic (proprietary) Object Oriented interface for interacting with PKCS#11 devices, for some people this is the right level to build on. However, we want to interact directly with the PKCS#11 API, so PKCS11js is the package to use.

PKCS#11 (also known as CryptoKI or PKCS11) is the standard interface for interacting with hardware crypto devices such as Smart Cards and Hardware Security Modules (HSMs) such as the SafeNet Luna and/or DPoD.

## Installation of node, npm and pkcs11js

On linux, install node npm, then use npm to install the pkcs11js module.  You can install these globally or locally within the folder tree of your specific application.

```
$ yum install node
$ yum install npm
$ npm install pkcs11js
```
The sample npm install command above is for a local installation.  Consult npm help to install globally.  Basically, you will need to run the following from the linux command line for each bash session or ensure the environment is set accordingly:

```
$ export NODE_PATH=`npm root -g`

```

Also, you will need to install a Luna or DPoD client.  The location of the libcklog2.so or libCryptoki2.so libraries will be needed for the sample code below.

## Examples

All examples are provided inline here as well as in separate files for download.

It is assumed the reader has a working knowledge of JavaScript.

PKCS#11 allows for the API to receive a null buffer and have the API return the required size, however, pkcs11js does not allow for this.  One must provide the proper allocated buffer upon the first call or an error will be returned.

The examples are just that, examples.  One should keep in mind that just because a sample gets slot or session info then that doesn't imply you need to get that same info *unless* your application needs to use that info.

Also, sessions in PKCS#11 need to be explicitly managed by the application.  Thus if you open a session and authenticate a r/w session by logging in then your app must track that session and what your app is doing with that session.  The PKCS#11 spec does not require enforcement of automatic session management.  If you open a session and login then your app should then logout and close that session after it is finished with those resources.

### Example #1 - get all mechanisms from the Luna/DPoD partition

```javascript
var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
//e.g.
pkcs11.load("/usr/safenet/lunaclient/lib/libCryptoki2_64.so");

pkcs11.C_Initialize();

try {
    // Getting info about PKCS11 Module
    var module_info = pkcs11.C_GetInfo();

    // Getting list of slots
    var slots = pkcs11.C_GetSlotList(true);
    var slot = slots[0];

    // Getting info about slot.  Do this if you need this info.
    var slot_info = pkcs11.C_GetSlotInfo(slot);
    // Getting info about token.  Do this if you need this info.
    var token_info = pkcs11.C_GetTokenInfo(slot);

    // Getting info about Mechanism.  Do this if you need this info.
    var mechs = pkcs11.C_GetMechanismList(slot);
    var mech_info = pkcs11.C_GetMechanismInfo(slot, mechs[0]);

    /**
    * Your app code here
    */
    console.log("mechs:", mechs);

}
catch(e){
    console.error(e);
}
finally {
    pkcs11.C_Finalize();
}
```

### Example #2 - create an AES symmetric key

```javascript
var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
//e.g.
pkcs11.load("/usr/safenet/lunaclient/lib/libCryptoki2_64.so");

pkcs11.C_Initialize();

try {
    // Getting info about PKCS11 Module.  Do this if you need this info.
    var module_info = pkcs11.C_GetInfo();

    // Getting list of slots
    var slots = pkcs11.C_GetSlotList(true);
    var slot = slots[0];

    //Sessions in PKCS#11 need to be explicitly managed by the application.  Thus if you open a session and
    //authenticate a r/w session by logging in then your app must track that session and what your app is
    //doing with that session.  The PKCS#11 spec does not require enforcement of automatic session management.
    //If you open a session and login then your app should then logout and close that session after it is
    //finished with those resources.
    var session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_RW_SESSION | pkcs11js.CKF_SERIAL_SESSION);

    // Getting info about Session.  Do this if you *need* to use this info.
    var info = pkcs11.C_GetSessionInfo(session);
    pkcs11.C_Login(session, 1, "userpin");

    /**
    * Your app code here
    */
    var template = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_SECRET_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My AES Key" },
        { type: pkcs11js.CKA_VALUE_LEN, value: 256 / 8 },
        { type: pkcs11js.CKA_ENCRYPT, value: true },
        { type: pkcs11js.CKA_DECRYPT, value: true },
    ];
    var key = pkcs11.C_GenerateKey(session, { mechanism: pkcs11js.CKM_AES_KEY_GEN }, template);
        pkcs11.C_Logout(session);
        pkcs11.C_CloseSession(session);
    console.log("key handle:",key.toJSON());

}
catch(e){
    console.error(e);
}
finally {
    pkcs11.C_Finalize();
}
```

### Example #3 - create an AES symmetric key and use it, via CBC mechanism, to encrypt and decrypt some data

```javascript
var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
//e.g.
pkcs11.load("/usr/safenet/lunaclient/lib/libCryptoki2_64.so");

pkcs11.C_Initialize();

try {
    // Getting info about PKCS11 Module
    var module_info = pkcs11.C_GetInfo();

    // Getting list of slots
    var slots = pkcs11.C_GetSlotList(true);
    var slot = slots[0];
    console.log("slots:");
    var len = slots.length;

    for (var i = 0; i < len; i++) {
        var myObject = slots[i];
        console.log(myObject.toJSON());
    }

    //Sessions in PKCS#11 need to be explicitly managed by the application.  Thus if you open a session and
    //authenticate a r/w session by logging in then your app must track that session and what your app is
    //doing with that session.  The PKCS#11 spec does not require enforcement of automatic session management.
    //If you open a session and login then your app should then logout and close that session after it is
    //finished with those resources.
    var session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_RW_SESSION | pkcs11js.CKF_SERIAL_SESSION);

    // Getting info about Session.  Do this if you *need* to use this info.
    var info = pkcs11.C_GetSessionInfo(session);
    console.log("slot: 0x" + slot.toString("hex"));
    console.log("session slot ID: 0x" + info.slotID.toString("hex"));
    console.log("session state:" + info.state);
    console.log("session flags:" + info.flags);
    console.log("session deviceError:" + info.deviceError);

    pkcs11.C_Login(session, 1, "userpin");

    /**
    * Your app code here
    */
    var template = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_SECRET_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My AES Key" },
        { type: pkcs11js.CKA_VALUE_LEN, value: 256 / 8 },
        { type: pkcs11js.CKA_ENCRYPT, value: true },
        { type: pkcs11js.CKA_DECRYPT, value: true },
    ];
    var secretKey = pkcs11.C_GenerateKey(session, { mechanism: pkcs11js.CKM_AES_KEY_GEN }, template);
    console.log("key handle:",secretKey.toJSON());

    var cbc_param = pkcs11.C_GenerateRandom(session, new Buffer(16), 16);

    pkcs11.C_EncryptInit(
        session,
        {
            mechanism: pkcs11js.CKM_AES_CBC,
            parameter: cbc_param
        },
        secretKey
    );

    var enc = new Buffer(0);
    enc = Buffer.concat([enc, pkcs11.C_EncryptUpdate(session, new Buffer("Incomming data 1"), new Buffer(16))]);
    enc = Buffer.concat([enc, pkcs11.C_EncryptUpdate(session, new Buffer("Incomming data N"), new Buffer(16))]);
    enc = Buffer.concat([enc, pkcs11.C_EncryptFinal(session, new Buffer(16))]);

    console.log("enc length:" + enc.length);
    console.log("0x" + enc.toString("hex"));

    pkcs11.C_DecryptInit(
        session,
        {
            mechanism: pkcs11js.CKM_AES_CBC,
            parameter: cbc_param
        },
        secretKey
    );

    var dec = new Buffer(0);
    dec = Buffer.concat([dec, pkcs11.C_DecryptUpdate(session, enc, new Buffer(32))]);
    dec = Buffer.concat([dec, pkcs11.C_DecryptFinal(session, new Buffer(16))]);

    console.log(dec.toString());
}
catch(e){
    console.error(e);
}
finally {
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
}
```

### Example #4 - create an AES symmetric key and use it, via GCM mechanism, to encrypt and decrypt some data

```javascript
var pkcs11js = require("pkcs11js");

//what has been implemented in pkcs11js as of 2020-01-02
const MechParams = {
  AesCBC: 1,
  AesCCM: 2,
  AesGCM: 3,
  RsaOAEP: 4,
  RsaPSS: 5,
  EcDH: 6,
  AesGCMv240: 7,
}

var pkcs11 = new pkcs11js.PKCS11();
pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
//e.g.
pkcs11.load("/usr/safenet/lunaclient/lib/libCryptoki2_64.so");

pkcs11.C_Initialize();

try {
    // Getting info about PKCS11 Module
    var module_info = pkcs11.C_GetInfo();

    // Getting list of slots
    var slots = pkcs11.C_GetSlotList(true);
    var slot = slots[0];

    //Sessions in PKCS#11 need to be explicitly managed by the application.  Thus if you open a session and
    //authenticate a r/w session by logging in then your app must track that session and what your app is
    //doing with that session.  The PKCS#11 spec does not require enforcement of automatic session management.
    //If you open a session and login then your app should then logout and close that session after it is
    //finished with those resources.
    var session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_RW_SESSION | pkcs11js.CKF_SERIAL_SESSION);

    // Getting info about Session.  Do this if you *need* to use this info.
    var info = pkcs11.C_GetSessionInfo(session);
    console.log("slot: 0x" + slot.toString("hex"));
    console.log("session slot ID: 0x" + info.slotID.toString("hex"));
    console.log("session state:" + info.state);
    console.log("session flags:" + info.flags);
    console.log("session deviceError:" + info.deviceError);

    pkcs11.C_Login(session, 1, "userpin");

    /**
    * Your app code here
    */
    var template = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_SECRET_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My AES Key" },
        { type: pkcs11js.CKA_VALUE_LEN, value: 256 / 8 },
        { type: pkcs11js.CKA_ENCRYPT, value: true },
        { type: pkcs11js.CKA_DECRYPT, value: true },
    ];
    var secretKey = pkcs11.C_GenerateKey(session, { mechanism: pkcs11js.CKM_AES_KEY_GEN }, template);
    console.log("key handle:",secretKey.toJSON());

    //Find the object (key in this case) to use below
    var searchTemplate = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_SECRET_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My AES Key" },
    ];
    pkcs11.C_FindObjectsInit(session, searchTemplate);
    objects = pkcs11.C_FindObjects(session, 1);
    pkcs11.C_FindObjectsFinal(session);
    console.log("objects found:", objects.length);
    if ( objects.length == 1) {
      var foundKey = objects[0];
      console.log("objects found:", foundKey);
      //clobber generated key handle with found key handle
      secretKey = foundKey;
    }

    // Generate AES GCM parameters
    // Generate random IV and setup IV params
    var iv = pkcs11.C_GenerateRandom(session, new Buffer(12), 12);
    // Generate Additional Authentication Data(AAD) bytes
    var aad = new Buffer("AAAD");
    // Generate iv bits size
    var ivBits = 12*8;//96
    // Generate tag bits size
    var tagBits = 128;
    var type = MechParams.AesGCM;
    console.log("MechParams.AesGCM=",MechParams.AesGCM);
    var gcm_params = {
      iv,
      ivBits: iv.length * 8,
      aad: aad,
      tagBits,
      type,
    };

    pkcs11.C_EncryptInit(
        session,
        {
            mechanism: pkcs11js.CKM_AES_GCM,
            parameter: gcm_params
        },
        secretKey
    );

    var enc = new Buffer(0);
    enc = Buffer.concat([enc, pkcs11.C_EncryptUpdate(session, new Buffer("Incomming data 1"), new Buffer(0))]);
    enc = Buffer.concat([enc, pkcs11.C_EncryptUpdate(session, new Buffer("Incomming data N"), new Buffer(0))]);
    //AES CGCM is a special case in that the encrypt final, not encrypt update, is where the full buffer is required
    enc = Buffer.concat([enc, pkcs11.C_EncryptFinal(session, new Buffer(48))]);

    console.log("enc length:" + enc.length);
    console.log("0x" + enc.toString("hex"));

    pkcs11.C_DecryptInit(
        session,
        {
            mechanism: pkcs11js.CKM_AES_GCM,
            parameter: gcm_params
        },
        secretKey
    );

    var dec = new Buffer(0);
    dec = Buffer.concat([dec, pkcs11.C_DecryptUpdate(session, enc, new Buffer(32))]);
    dec = Buffer.concat([dec, pkcs11.C_DecryptFinal(session, new Buffer(32))]);

    console.log("dec length:" + dec.length);
    console.log(dec.toString());
}
catch(e){
    console.error(e);
}
finally {
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
}
```

### Example #5 - create an RSA asymmetric key pair and use it to sign and verify some data

```javascript
var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
//e.g.
pkcs11.load("/usr/safenet/lunaclient/lib/libCryptoki2_64.so");

pkcs11.C_Initialize();

try {
    // Getting info about PKCS11 Module
    var module_info = pkcs11.C_GetInfo();

    // Getting list of slots
    var slots = pkcs11.C_GetSlotList(true);
    var slot = slots[0];

    //Sessions in PKCS#11 need to be explicitly managed by the application.  Thus if you open a session and
    //authenticate a r/w session by logging in then your app must track that session and what your app is
    //doing with that session.  The PKCS#11 spec does not require enforcement of automatic session management.
    //If you open a session and login then your app should then logout and close that session after it is
    //finished with those resources.
    var session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_RW_SESSION | pkcs11js.CKF_SERIAL_SESSION);

    // Getting info about Session.  Do this if you *need* to use this info.
    var info = pkcs11.C_GetSessionInfo(session);
    console.log("slot: 0x" + slot.toString("hex"));
    console.log("session slot ID: 0x" + info.slotID.toString("hex"));
    console.log("session state:" + info.state);
    console.log("session flags:" + info.flags);
    console.log("session deviceError:" + info.deviceError);

    pkcs11.C_Login(session, 1, "userpin");

    /**
    * Your app code here
    */
    var publicKeyTemplate = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_PUBLIC_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My RSA Public Key" },
        { type: pkcs11js.CKA_PUBLIC_EXPONENT, value: new Buffer([1, 0, 1]) },
        { type: pkcs11js.CKA_MODULUS_BITS, value: 2048 },
        { type: pkcs11js.CKA_VERIFY, value: true }
    ];
    var privateKeyTemplate = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_PRIVATE_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My RSA Private Key" },
        { type: pkcs11js.CKA_SIGN, value: true },
    ];
    var keys = pkcs11.C_GenerateKeyPair(session, { mechanism: pkcs11js.CKM_RSA_PKCS_KEY_PAIR_GEN }, publicKeyTemplate, privateKeyTemplate);

    pkcs11.C_SignInit(session, { mechanism: pkcs11js.CKM_SHA256_RSA_PKCS }, keys.privateKey);

    pkcs11.C_SignUpdate(session, new Buffer("Incomming message 1"));
    pkcs11.C_SignUpdate(session, new Buffer("Incomming message N"));

    var signature = pkcs11.C_SignFinal(session, Buffer(256));


    pkcs11.C_VerifyInit(session, { mechanism: pkcs11js.CKM_SHA256_RSA_PKCS }, keys.publicKey);

    pkcs11.C_VerifyUpdate(session, new Buffer("Incomming message 1"));
    pkcs11.C_VerifyUpdate(session, new Buffer("Incomming message N"));

    var verify = pkcs11.C_VerifyFinal(session, signature);

}
catch(e){
    console.error(e);
}
finally {
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
}
```

### Example #6 - create an EC asymmetric key pair and use it to sign and verify some data

```javascript
var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
//e.g.
pkcs11.load("/usr/safenet/lunaclient/lib/libCryptoki2_64.so");

pkcs11.C_Initialize();

try {
    // Getting info about PKCS11 Module
    var module_info = pkcs11.C_GetInfo();

    // Getting list of slots
    var slots = pkcs11.C_GetSlotList(true);
    var slot = slots[0];

    //Sessions in PKCS#11 need to be explicitly managed by the application.  Thus if you open a session and
    //authenticate a r/w session by logging in then your app must track that session and what your app is
    //doing with that session.  The PKCS#11 spec does not require enforcement of automatic session management.
    //If you open a session and login then your app should then logout and close that session after it is
    //finished with those resources.
    var session = pkcs11.C_OpenSession(slot, pkcs11js.CKF_RW_SESSION | pkcs11js.CKF_SERIAL_SESSION);

    // Getting info about Session.  Do this if you *need* to use this info.
    var info = pkcs11.C_GetSessionInfo(session);
    console.log("slot: 0x" + slot.toString("hex"));
    console.log("session slot ID: 0x" + info.slotID.toString("hex"));
    console.log("session state:" + info.state);
    console.log("session flags:" + info.flags);
    console.log("session deviceError:" + info.deviceError);

    pkcs11.C_Login(session, 1, "userpin");

    /**
    * Your app code here
    */
    var publicKeyTemplate = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_PUBLIC_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My EC Public Key" },
        { type: pkcs11js.CKA_EC_PARAMS, value: new Buffer("06082A8648CE3D030107", "hex") }, // secp256r1
        { type: pkcs11js.CKA_VERIFY, value: true },
    ];
    var privateKeyTemplate = [
        { type: pkcs11js.CKA_CLASS, value: pkcs11js.CKO_PRIVATE_KEY },
        { type: pkcs11js.CKA_TOKEN, value: false },
        { type: pkcs11js.CKA_LABEL, value: "My EC Private Key" },
        { type: pkcs11js.CKA_DERIVE, value: true },
        { type: pkcs11js.CKA_SIGN, value: true },
    ];
    var keys = pkcs11.C_GenerateKeyPair(session, { mechanism: pkcs11js.CKM_EC_KEY_PAIR_GEN }, publicKeyTemplate, privateKeyTemplate);

    pkcs11.C_SignInit(session, { mechanism: pkcs11js.CKM_ECDSA }, keys.privateKey);

    pkcs11.C_SignUpdate(session, new Buffer("Incomming message 1"));
    pkcs11.C_SignUpdate(session, new Buffer("Incomming message N"));

    var signature = pkcs11.C_SignFinal(session, Buffer(256));

    pkcs11.C_VerifyInit(session, { mechanism: pkcs11js.CKM_ECDSA }, keys.publicKey);

    pkcs11.C_VerifyUpdate(session, new Buffer("Incomming message 1"));
    pkcs11.C_VerifyUpdate(session, new Buffer("Incomming message N"));

    var verify = pkcs11.C_VerifyFinal(session, signature);

}
catch(e){
    console.error(e);
}
finally {
    pkcs11.C_Logout(session);
    pkcs11.C_CloseSession(session);
    pkcs11.C_Finalize();
}
```

## Bug Reporting
Please report bugs/issues to Thales.
