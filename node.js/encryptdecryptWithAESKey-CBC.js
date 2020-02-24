var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
//pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
//pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
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

