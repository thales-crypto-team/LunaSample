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
