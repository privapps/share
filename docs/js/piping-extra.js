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