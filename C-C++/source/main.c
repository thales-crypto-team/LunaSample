/*
  This file is used to demonstrate how to interface to SafeNet's 
  licensed development product. You have a royalty-free right 
  to use, modify, reproduce and distribute this demonstration 
  file (including any modified version), provided that you agree 
  that SafeNet has no warranty, implied or otherwise, or liability 
  for this demonstration file or any modified version of it.
*/

#ifdef OS_WIN32
#include <windows.h>
#else
#ifdef OS_HPUX
  #include <dl.h>
#else
#include <dlfcn.h>
#endif
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "cryptoki_v2.h"

#define		PLAIN_SZ	512

#ifdef OS_WIN32
HINSTANCE						LibHandle = 0;
#else
#ifdef OS_HPUX
shl_t							LibHandle = 0;
#else
void*							LibHandle = NULL;
#endif
#endif

CK_FUNCTION_LIST*				P11Functions = NULL;
CK_SFNT_CA_FUNCTION_LIST*		SfntFunctions = NULL;

CK_OBJECT_HANDLE				hSymKey = 0;
CK_BYTE							PlainText[PLAIN_SZ];
CK_BYTE*						P_EncText = NULL;
CK_ULONG						EncSz = 0;
CK_BYTE*						P_DecText = NULL;
CK_ULONG						PlainSz = 0;

char							EnvLib[4096];

/*
	FUNCTION:		CK_BBOOL GetLibrary()
*/
CK_BBOOL GetLibrary()
{
	CK_BBOOL						myRC = CK_FALSE;
	char*							pPath = NULL;
	
	pPath = getenv( "SfntLibPath" );
	if( pPath == NULL )
	{
		printf("Failed to get \"SfntLibPath\"\n");
		printf("Please create and export an environment variable that points to the directory\n");
		printf("where the SafeNet cryptoki library is located and call this \"SfntLibPath\"\n");
		return CK_FALSE;
	}

	memset( EnvLib, 0, sizeof( EnvLib ) );

#ifdef OS_WIN32
	_snprintf( EnvLib, sizeof(EnvLib)-1, "%s\\cryptoki.dll", pPath );
#else
#ifdef OS_HPUX
	snprintf( EnvLib, sizeof(EnvLib)-1, "%s/libCryptoki2.sl", pPath );
#else
	snprintf( EnvLib, sizeof(EnvLib)-1, "%s/libCryptoki2.so", pPath );
#endif
#endif

	myRC = CK_TRUE;

	return myRC;
}

/*
	FUNCTION:		CK_BBOOL LoadP11Functions()
*/
CK_BBOOL LoadP11Functions()
{
	CK_BBOOL						myRC = CK_FALSE;
	CK_C_GetFunctionList			C_GetFunctionList = NULL;
	CK_RV							rv = CKR_TOKEN_NOT_PRESENT;
	
	if( GetLibrary() == CK_FALSE )
		return CK_FALSE;

#ifdef OS_WIN32
	LibHandle = LoadLibrary( EnvLib );
	if( LibHandle )
	{
		C_GetFunctionList = (CK_C_GetFunctionList)GetProcAddress( LibHandle, "C_GetFunctionList" );
	}
#else
#ifdef OS_HPUX
	LibHandle = shl_load( EnvLib, BIND_IMMEDIATE | BIND_VERBOSE, 0 );
	if( LibHandle )
	{
		int iErr = -1;
		iErr = shl_findsym( &LibHandle, "C_GetFunctionList", TYPE_PROCEDURE, (void*)&C_GetFunctionList );
	}
#else
	LibHandle = dlopen( EnvLib, RTLD_NOW );
	if( LibHandle )
	{
		C_GetFunctionList = (CK_C_GetFunctionList)dlsym( LibHandle, "C_GetFunctionList" );
	}
#endif
#endif

	if( !LibHandle )
	{
		printf("failed to load %s\n", EnvLib);
	}

	if( C_GetFunctionList )
	{
		rv = C_GetFunctionList( &P11Functions );
	}

	if( P11Functions )
	{
		rv = P11Functions->C_Initialize( NULL_PTR );
	}

	if( rv == CKR_OK )
	{
		myRC = CK_TRUE;
	}

	return myRC;
}

/*
	FUNCTION:		CK_BBOOL LoadSfntExtensionFunctions()
*/
CK_BBOOL LoadSfntExtensionFunctions()
{
	CK_BBOOL						myRC = CK_FALSE;
	CK_CA_GetFunctionList			CA_GetFunctionList = NULL;
	CK_RV							rv = CKR_TOKEN_NOT_PRESENT;
	int								iErr = -1;

#ifdef OS_WIN32
	CA_GetFunctionList = (CK_CA_GetFunctionList)GetProcAddress( LibHandle, "CA_GetFunctionList" );
#else
#ifdef OS_HPUX
	iErr = shl_findsym( &LibHandle, "CA_GetFunctionList", TYPE_PROCEDURE, (void*)&CA_GetFunctionList );
#else
	CA_GetFunctionList = (CK_CA_GetFunctionList)dlsym( LibHandle, "CA_GetFunctionList" );
#endif
#endif

	if( CA_GetFunctionList )
	{
		rv = CA_GetFunctionList( &SfntFunctions );
	}

	if( SfntFunctions )
	{
		myRC = CK_TRUE;
	}

	return myRC;
}

/*
	FUNCTION:		CK_RV Generate3DESKey( CK_SESSION_HANDLE hSession )
*/
CK_RV Generate3DESKey( CK_SESSION_HANDLE hSession )
{
    CK_RV					retCode = CKR_OK;    
    CK_MECHANISM			mech;
    CK_OBJECT_CLASS			obClass = CKO_SECRET_KEY;
    CK_KEY_TYPE				keyType = CKK_DES3;
    CK_CHAR					pDESKeyLabel[] = "DES3 Encryption Key";
	CK_BBOOL				yes = CK_TRUE;
	CK_BBOOL				no = CK_FALSE;
    CK_ULONG				templateSz;
   
    CK_ATTRIBUTE   pDESKeyAttributes[] =
    {
        {CKA_CLASS,             &obClass,          sizeof(CK_OBJECT_CLASS)        },
        {CKA_KEY_TYPE,          &keyType,          sizeof(CK_KEY_TYPE)            },
        {CKA_LABEL,             pDESKeyLabel,      sizeof(pDESKeyLabel) - 1       },
        {CKA_PRIVATE,           &yes,              sizeof(CK_BBOOL)               },
        {CKA_SENSITIVE,         &yes,              sizeof(CK_BBOOL)               },
        {CKA_ENCRYPT,           &yes,              sizeof(CK_BBOOL)               },
        {CKA_DECRYPT,           &yes,              sizeof(CK_BBOOL)               },
        {CKA_WRAP,              &yes,              sizeof(CK_BBOOL)               },
        {CKA_UNWRAP,            &yes,              sizeof(CK_BBOOL)               },
        {CKA_EXTRACTABLE,       &yes,              sizeof(CK_BBOOL)               }
    };


   // Build mechanism
	mech.mechanism = CKM_DES3_KEY_GEN;
	mech.pParameter = NULL;
	mech.ulParameterLen = 0;
	
	templateSz = sizeof(pDESKeyAttributes) / sizeof(*pDESKeyAttributes);
	retCode = P11Functions->C_GenerateKey( hSession, 
                            &mech,
                            pDESKeyAttributes,
                            templateSz,
                            &hSymKey );
	
	return retCode;
}

/*
	FUNCTION:		CK_RV DecryptData( CK_SESSION_HANDLE hSession )
*/
CK_RV DecryptData( CK_SESSION_HANDLE hSession )
{
	CK_MECHANISM		mech;
    CK_RV				rv = CKR_OK;

	
	mech.mechanism      = CKM_DES3_CBC_PAD;
    mech.pParameter     = (void*) "12345678"; // 8 byte IV
    mech.ulParameterLen = 8;

    rv = P11Functions->C_DecryptInit( hSession, &mech, hSymKey );
	if( rv != CKR_OK )
		goto doneDec;

	rv = P11Functions->C_Decrypt( hSession, P_EncText, EncSz, NULL, &PlainSz );
	if( rv != CKR_OK )
		goto doneDec;

	P_DecText = (CK_BYTE*)calloc( PlainSz, 1 );
	if( P_DecText == NULL )
		goto doneDec;

	rv = P11Functions->C_Decrypt( hSession, P_EncText, EncSz, P_DecText, &PlainSz );
	if( rv != CKR_OK )
		goto doneDec;

doneDec:

	return rv;
}

/*
	FUNCTION:		CK_RV EncryptData( CK_SESSION_HANDLE hSession )
*/
CK_RV EncryptData( CK_SESSION_HANDLE hSession )
{
	CK_MECHANISM		mech;
    CK_RV				rv = CKR_OK;

	
	mech.mechanism      = CKM_DES3_CBC_PAD;
    mech.pParameter     = (void*) "12345678"; // 8 byte IV
    mech.ulParameterLen = 8;

    rv = P11Functions->C_EncryptInit( hSession, &mech, hSymKey );
	if( rv != CKR_OK )
		goto doneEnc;

	rv = P11Functions->C_Encrypt( hSession, PlainText, sizeof(PlainText), NULL, &EncSz );
	if( rv != CKR_OK )
		goto doneEnc;

	P_EncText = (CK_BYTE*)calloc( EncSz, 1 );
	if( P_EncText == NULL )
		goto doneEnc;

	rv = P11Functions->C_Encrypt( hSession, PlainText, sizeof(PlainText), P_EncText, &EncSz );
	if( rv != CKR_OK )
		goto doneEnc;

doneEnc:

	return rv;
}

/*
	FUNCTION:		CK_RV FindFirstSlot( CK_SLOT_ID *pckSlot )
*/
CK_RV FindFirstSlot( CK_SLOT_ID *pckSlot )
{
	CK_SLOT_ID_PTR			pSlotList = NULL;
	CK_ULONG				ulCount = 0;
	CK_RV					retCode = CKR_OK;

	retCode = P11Functions->C_GetSlotList(CK_TRUE, NULL, &ulCount);
	if(retCode != CKR_OK)
		goto findSlot;

	if( ulCount == 0 )
		goto findSlot;
	
	pSlotList = (CK_SLOT_ID_PTR)calloc(ulCount, sizeof(CK_SLOT_ID));
	if( pSlotList == NULL )
		goto findSlot;

	retCode = P11Functions->C_GetSlotList(CK_TRUE, pSlotList, &ulCount);
	if(retCode != CKR_OK)
		goto findSlot;

	*pckSlot = pSlotList[0];

findSlot:

	if( pSlotList )
		free(pSlotList);

	return retCode;
}

/*
	FUNCTION:		int main(int argc, char* argv[])
*/
int main(int argc, char* argv[])
{
	int					rc = -1;
	CK_RV				rv = CKR_TOKEN_NOT_PRESENT;
	CK_SESSION_HANDLE	hSession = 0;
	CK_SLOT_ID			ckSlot = 0;
	CK_BYTE				bPassword[64] = "userpin";//set this to whatever the real password is

	

	memset( PlainText, 65, sizeof(PlainText) );

	if( LoadP11Functions() == CK_FALSE )
	{
		printf( "Failed to load PKCS11 library!\n" );
		goto doneMain;
	}

	if( LoadSfntExtensionFunctions() == CK_FALSE )
	{
		printf( "Failed to load SafeNet extension functions!\n" );
		goto doneMain;
	}

	rv = FindFirstSlot( &ckSlot );
	if( (rv != CKR_OK) || (ckSlot == 0) )
		goto doneMain;

	rv = P11Functions->C_OpenSession( ckSlot, CKF_RW_SESSION|CKF_SERIAL_SESSION, NULL, NULL, &hSession );
	if( rv != CKR_OK )
		goto doneMain;
	
	rv = P11Functions->C_Login( hSession, CKU_USER, bPassword, strlen((char*)bPassword) );
	if( rv != CKR_OK )
		goto doneMain;

	rv = Generate3DESKey( hSession );
	if( rv != CKR_OK )
		goto doneMain;

	rv = EncryptData( hSession );
	if( rv != CKR_OK )
		goto doneMain;

	rv = DecryptData( hSession );

doneMain:

	if( P_DecText && (memcmp( PlainText, P_DecText, sizeof(PlainText) ) == 0) )
	{
		printf("all is OKAY!\n");
		rc = 0;
	}
	else
	{
		printf("all is NOT OKAY! rv = 0x%x\n", rv);
		rc = -1;
	}

	if( P11Functions )
	{
		if( hSession )
			P11Functions->C_CloseSession( hSession );

		P11Functions->C_Finalize( NULL_PTR );
	}

	if( LibHandle )
	{
#ifdef OS_WIN32
		FreeLibrary( LibHandle );
#else
#ifdef OS_HPUX
		shl_unload(LibHandle);
#else
		dlclose( LibHandle );
#endif
#endif
	}

	if( P_DecText )
		free( P_DecText );

	if( P_EncText )
		free( P_EncText );

	return rc;
}



