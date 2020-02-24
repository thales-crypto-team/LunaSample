var pkcs11js = require("pkcs11js");

var pkcs11 = new pkcs11js.PKCS11();
//pkcs11.load("<path_to_p11_library>/libcklog2.so");
//OR
//pkcs11.load("<path_to_p11_library>/libCryptoki2.so");
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
