// functions/index.js

const { onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Set runtime options for all functions in this file
setGlobalOptions({ runtime: 'nodejs20' });

admin.initializeApp();
const db = admin.firestore();


// --- FUNCTION 1: Publicly Callable to Generate a PIN ---
exports.generatePairingCode = onCall(async (request) => {
    logger.info("generatePairingCode triggered.");
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pairingSessionId = db.collection("temp").doc().id;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const pairingRequestRef = db.collection("pairingRequests").doc(pairingSessionId);
    await pairingRequestRef.set({
        pin: pin,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
    });

    logger.info(`Successfully created pairing request ${pairingSessionId}.`);
    return { pin, pairingSessionId };
});


// --- FUNCTION 2: Completes Pairing for an Existing Screen ID ---
// This function requires an authenticated admin user.
exports.completePairing = onCall({ enforceAppCheck: true }, async (request) => {
    logger.info("completePairing triggered.");

    if (!request.auth) {
        throw new onCall.HttpsError("unauthenticated", "Authentication is required.");
    }

    const { pin, screenId } = request.data;
    const adminUid = request.auth.uid;

    if (!pin || !screenId) {
        throw new onCall.HttpsError("invalid-argument", "A PIN and screenId must be provided.");
    }
    
    const pairingRequestsRef = db.collection("pairingRequests");
    const q = pairingRequestsRef.where("pin", "==", pin).where("status", "==", "pending");
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        logger.warn(`Invalid or expired PIN received: ${pin}`);
        throw new onCall.HttpsError("not-found", "Invalid or expired PIN. Please try again.");
    }

    const pairingDoc = querySnapshot.docs[0];

    // Create a custom authentication token for the screen's ID.
    // This allows the screen client to log in as itself.
    const customToken = await admin.auth().createCustomToken(screenId);
    logger.info(`Created custom token for existing screenId: ${screenId}`);

    // Update the original pairing request to complete it and pass the token.
    await pairingDoc.ref.update({
        status: "completed",
        customToken: customToken,
        pairedByUid: adminUid,
        screenId: screenId,
    });

    logger.info(`Successfully paired screen ${screenId} for admin ${adminUid}.`);
    return { success: true, message: "Screen paired successfully!" };
});