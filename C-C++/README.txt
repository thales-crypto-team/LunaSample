Notes on the p11Sample

pllSample is a simple "C" language cross platform source example.
It demonstrates:  how to dynamically load the SafeNet cryptoki library;
and how to obtain the function pointers to the exported PKCS11 standard
functions and the SafeNet extension functions.

The sample demonstrates how to invoke some but not all of the API functions.

The sample depends on an environment variable created and exported
prior to execution.  This variable specifies the location of the "cryptoki.dll" on
Windows or the "libCryptoki2.so" on UNIX.
This variable is called "SfntLibPath".
You are free to provide your own means for locating the library.

The sample first attempts to load the dynamic library in the function
called "LoadP11Functions". This will call:

	"LoadLibrary" on Windows

or

	"dlopen" on UNIX

The function then attempts to get a function pointer to the PKCS11
API "C_GetFunctionList" using:

	"GetProcAddress" on Windows

or

	"dlsym" on UNIX.

Once the function pointer is obtained, use the API to obtain
a pointer called "P11Functions" that points to the static CK_FUNCTION_LIST
structure in the library. This structure holds pointers to all the other
PKCS11 API functions supported by the library.
At this point, if successful, PKCS11 APIs may be invoked like the following:

P11Functions->C_Initialize(...);
P11Functions->C_GetSlotList(...);
P11Functions->C_OpenSession(...);
P11Functions->C_Login(...);
P11Functions->C_GenerateKey(...);
P11Functions->C_Encrypt(...);
:
:
etc


The sample next attempts to get a function pointer to the SafeNet
extension API "CA_GetFunctionList" using:

	"GetProcAddress" on Windows

or

	"dlsym" on UNIX.

Once the function pointer is obtained, use the API to obtain
a pointer called "SfntFunctions" that points to the static CK_SFNT_CA_FUNCTION_LIST
structure in the library. This structure holds pointers to some but not all
of the other SafeNet extension API functions supported by the library.

At this point, if successful, SafeNet extension APIs may be invoked like the following:

SfntFunctions->CA_GetHAState(...);
:
:
etc.


Three sample makefiles are provided: one for 32-bit Windows; one for 32-bit Linux; and one for 64-bit AIX.
You can easily port to another platform with minor changes.

To build:

Windows:
		nmake -f Makefile.win32

Linux:
		make -f Makefile.linux.32

AIX:
		make -f Makefile.aix.64



