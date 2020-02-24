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
