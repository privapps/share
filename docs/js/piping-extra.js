async function sha256(message) {
    // Encode the message as a Uint8Array
    const encodedMessage = new TextEncoder().encode(message);

    // Generate the hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedMessage);

    // Convert the buffer to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

async function generateKeyFromSeed(seed, saltStr = 'some_salt') {
    const encoder = new TextEncoder();
    const salt = encoder.encode(saltStr);

    // Derive key using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(seed), { name: "PBKDF2" },
        false, ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey({
            "name": "PBKDF2",
            salt,
            "iterations": 100000, // You can adjust the number of iterations as needed
            "hash": "SHA-256"
        },
        keyMaterial, { "name": "AES-GCM", "length": 256 },
        true, ["encrypt", "decrypt"]
    );

    return key;
}

async function encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate IV
    const algorithm = { name: "AES-GCM", iv };
    const encryptedData = await crypto.subtle.encrypt(algorithm, key, data);
    return { encryptedData, iv }; // Return both encrypted data and IV
}

async function decrypt(encryptedData, key, iv) {
    const algorithm = { name: "AES-GCM", iv };
    const decryptedData = await crypto.subtle.decrypt(algorithm, key, encryptedData);
    return new TextDecoder().decode(decryptedData); // Convert decrypted data to string
}

async function encrypt2Str(data, key) {
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        return btoa(String.fromCharCode.apply(null, bytes));
    }
    const {
        encryptedData,
        iv
    } = await encrypt(new TextEncoder().encode(data), key)
    return arrayBufferToBase64(encryptedData) + '|' + btoa(String.fromCharCode.apply(null, iv))
}

async function decrypt2Str(str, key) {
    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function getIVFromBase64(base64String) {
        const binaryString = atob(base64String);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    const s = str.split('|')
    edo = base64ToArrayBuffer(s[0])
    ivo = getIVFromBase64(s[1])
    return decrypt(edo, key, ivo)
}

async function encrypt2bin(data, key) {
    const {
        encryptedData,
        iv
    } = await encrypt(new TextEncoder().encode(data), key)
    const uint8Array = new Uint8Array(encryptedData);
    const combinedArray = new Uint8Array(iv.length + uint8Array.length);
    combinedArray.set(iv, 0);
    combinedArray.set(uint8Array, iv.length);
    return combinedArray
}

async function decryptStrFromBin(bytes, key) {
    const ivLength = 12
    const oiv = bytes.slice(0, ivLength);
    const odt = bytes.slice(ivLength);
    return decrypt(odt, key, oiv)
}

/**
 * Compress files with minizip 
 * this requires https://www.npmjs.com/package/minizip-asm.js 
 * files from html, password should be str and out_file_name should be str
 * return encrypted file
 */
async function compress_with_minizip_and_encrypt(files, password, out_file_name) {
    const mzip = new Minizip();

    // Map each file to a promise and collect those promises in an array
    const promises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                mzip.append(file.name, event.target.result, {
                    password: password
                });
                resolve();
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsArrayBuffer(file); // Use readAsArrayBuffer for binary data
        });
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    // Create a new file from the zip content
    return new File([mzip.zip()], out_file_name, {
        type: 'application/octet-binary'
    });
}