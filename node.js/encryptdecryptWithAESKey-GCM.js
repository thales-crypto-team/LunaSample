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
