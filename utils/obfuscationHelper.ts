import { config } from "../config/envConfig.ts";
import { AppError } from "./globalErrorHandler.ts";

const crypto = await import("node:crypto");

const SECRET = config.vLinkSecret;
const VALID_DURATION = 15 * 60 * 1000; // 15 mins - for registration
const VALID_DURATION_FP = 10 * 60 * 1000; // 10 mins - for password reset
const OTP_LENGTH = 8;
const KEY = config.vLinkKey;

function encryptEncode(token: string, okay: string, initVect = "") {
	const key = Buffer.from(okay, "base64url");
	const iv = (initVect && (Buffer.byteLength(initVect, "base64url") === 16))
		? Buffer.from(initVect, "base64url")
		: crypto.randomBytes(16);
	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
	const encrypted = [];
	encrypted.push(cipher.update(token, "utf8"));
	encrypted.push(cipher.final());
	encrypted.push(iv);
	const fullBuff = Buffer.concat(encrypted);
	const craftedBuff = Buffer.concat([fullBuff.subarray(0, 12), iv, fullBuff.subarray(12, fullBuff.length - 16)]);
	return { cipherText: craftedBuff.toString("base64url") };
}

function decryptEncode(token: string, okay: string) {
	const key = Buffer.from(okay, "base64url");
	const inputBuff = Buffer.from(token, "base64url");
	const encrypted = Buffer.concat([inputBuff.subarray(0, 12), inputBuff.subarray(28)]);
	const iv = inputBuff.subarray(12, 28);
	const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
	const decrypted = [];
	decrypted.push(decipher.update(encrypted));
	decrypted.push(decipher.final());
	return Buffer.concat(decrypted).toString("utf8");
}

function getOtpBase62(stringBuffer: NodeJS.ArrayBufferView<ArrayBufferLike>, secret: string) {
	const BASE62POOL = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	const BASE = 62n;
	const MODULUS = BASE ** BigInt(OTP_LENGTH);
	const otpBuff = crypto.createHmac("sha256", secret).update(stringBuffer).digest();
	const otpBuffBigInt = BigInt("0x" + otpBuff.toString("hex"));
	let workingValue = otpBuffBigInt % MODULUS;
	let otp = "";
	for (let i = 0; i < OTP_LENGTH; i++) {
		otp = BASE62POOL[Number(workingValue % BASE)] + otp;
		workingValue = workingValue / BASE;
	}
	return otp;
}

// used for user registration
const generateTokenReg = (id: string, duration?: number) => {
	const expiryTime = Date.now() + (duration || VALID_DURATION);
	const nonce = crypto.randomBytes(8).toString("base64");
	const tokenPayload = `${id}:${nonce}<${expiryTime}`;

	const hash = crypto.createHmac("sha256", SECRET).update(tokenPayload).digest("base64url");
	const { cipherText: encoded } = encryptEncode(`${tokenPayload}:${hash}`, KEY);

	return encoded;
};

const verifyTokenReg = (token: string) => {
	const decoded = decryptEncode(token.trim(), KEY);
	const [id, nonce, exprStr, hash] = decoded.split(/[<:]+(?=(?:[^"]*"[^"]*")*[^"]*$)/);
	const expiryTime = parseInt(exprStr);

	if (Date.now() > expiryTime) {
		console.log("This link has expired! ", { validTill: new Date(expiryTime).toLocaleTimeString() });
		return new AppError("This link has expired!", 400);
	}

	const tokenPayload = `${id}:${nonce}<${expiryTime}`;
	const newHash = crypto.createHmac("sha256", SECRET).update(tokenPayload).digest();

	if (!(crypto.timingSafeEqual(Buffer.from(hash, "base64url"), newHash))) {
		return new AppError("I'm a teapot. Don't give me coffee.", 418);
	}

	return id;
};

// used for password reset - both link and otp. If true is passed to sendOtp, otp will be generated, otherwise not.
const generateTokenPass = (id: string, sendOtp?: boolean, duration?: number) => {
	const expiryTime = Date.now() + (duration || VALID_DURATION_FP);
	const nonce = crypto.randomBytes(12);
	const tokenPayload = `${id}>${nonce.toString("base64")}:${expiryTime}`;

	const helper = crypto.randomBytes(16);
	const hash = crypto.createHmac("sha256", config.otpTSecret).update(tokenPayload).digest();
	const { cipherText: encoded } = encryptEncode(
		`${hash.toString("base64url")}<${tokenPayload}`,
		config.otpT2Secret,
		helper.toString("base64url"),
	);

	const expiryBuffer = Buffer.alloc(8);
	expiryBuffer.writeBigUInt64BE(BigInt(expiryTime), 0);
	const storageHashSource = nonce.toString("base64") + ":" + hash.toString("base64") + ":"
		+ expiryBuffer.toString("base64") + ":" + Buffer.from(id, "hex").toString("base64");
	const storageHashSource64 = Buffer.from(storageHashSource, "utf8").toString("base64url");
	const { cipherText: hashToStore } = encryptEncode(
		storageHashSource64,
		config.otpFSecret,
		helper.toString("base64url"),
	);

	if (sendOtp) {
		const otp = getOtpBase62(Buffer.from(storageHashSource64, "base64url"), config.otpFSecret);
		return { tokenToSend: encoded, tokenHashToStore: hashToStore, otpToSend: otp };
	}
	else return { tokenToSend: encoded, tokenHashToStore: hashToStore };
};

type VerifyTokenLinkParams = { token: string; };
type VerifyTokenOtpParams = { id: string; tokenHash: string; otp: string; };
type VerifyTokenReturnTypeLink = {
	match: boolean;
	id: string | undefined | null; // null = expired, undefined = not expired but failed match, string = success
	mode: "link";
	derivedHash: string | undefined;
};
type VerifyTokenReturnTypeOtp = {
	match: boolean;
	id: string | undefined | null; // null = expired, undefined = not expired but failed match, string = success
	mode: "otp";
};
interface VerifyTokenFunction {
	(param: VerifyTokenLinkParams): VerifyTokenReturnTypeLink;
	(param: VerifyTokenOtpParams): VerifyTokenReturnTypeOtp;
}

const verifyTokenPass: VerifyTokenFunction = (param): any => {
	if ("otp" in param) {
		let returnObject: VerifyTokenReturnTypeOtp;
		const hashToBreak = decryptEncode(param.tokenHash, config.otpFSecret);
		const storageHashSourceBuf = Buffer.from(hashToBreak, "base64url");
		const storageHashSource = storageHashSourceBuf.toString("utf8");
		const [nonceString64, hashString64, expiryString64, id64] = storageHashSource.split(
			/[:]+(?=(?:[^"]*"[^"]*")*[^"]*$)/,
		);
		const expiryTime = Number(Buffer.from(expiryString64, "base64").readBigUInt64BE(0));
		if (Date.now() > expiryTime) {
			returnObject = { match: false, id: null, mode: "otp" };
			return returnObject;
		}
		const otpExtracted = getOtpBase62(storageHashSourceBuf, config.otpFSecret);
		if (
			crypto.timingSafeEqual(Buffer.from(otpExtracted), Buffer.from(param.otp))
			&& crypto.timingSafeEqual(Buffer.from(param.id, "hex"), Buffer.from(id64, "base64"))
		) {
			returnObject = { match: true, id: Buffer.from(id64, "base64").toString("hex"), mode: "otp" };
			return returnObject;
		}
		else {
			returnObject = { match: false, id: undefined, mode: "otp" };
			return returnObject;
		}
	}
	else {
		let returnObject: VerifyTokenReturnTypeLink;
		const receivedEncoded = param.token.trim();
		const helperBuffer = Buffer.from(receivedEncoded, "base64url").subarray(12, 28);
		const dec1 = decryptEncode(receivedEncoded, config.otpT2Secret);
		const [hash, id, nonce, expiry] = dec1.split(/[<:>]+(?=(?:[^"]*"[^"]*")*[^"]*$)/);
		const expiryTime = parseInt(expiry);
		if (Date.now() > expiryTime) {
			returnObject = { match: false, id: null, mode: "link", derivedHash: undefined };
			return returnObject;
		}
		const hashBuffer = Buffer.from(hash, "base64url");
		const payloadRebuilt = `${id}>${nonce}:${expiryTime}`;
		const hashBufferDerived = crypto.createHmac("sha256", config.otpTSecret).update(payloadRebuilt).digest();
		if (crypto.timingSafeEqual(hashBuffer, hashBufferDerived)) {
			const expiryBuffer = Buffer.alloc(8);
			expiryBuffer.writeBigUInt64BE(BigInt(expiryTime), 0);
			const storageHashSource = nonce + ":" + hashBuffer.toString("base64") + ":"
				+ expiryBuffer.toString("base64") + ":" + Buffer.from(id, "hex").toString("base64");
			const storageHashSource64 = Buffer.from(storageHashSource, "utf8").toString("base64url");
			const { cipherText: hashToStore } = encryptEncode(
				storageHashSource64,
				config.otpFSecret,
				helperBuffer.toString("base64url"),
			);
			returnObject = { match: true, id, mode: "link", derivedHash: hashToStore };
			return returnObject;
		}
		else {
			returnObject = { match: false, id: undefined, mode: "link", derivedHash: undefined };
			return returnObject;
		}
	}
};

// const fpLinkHashDeriver = (gen: string, store: string) => {
// 	const inputBuff = Buffer.from(store, "base64url");
// 	const iv = inputBuff.subarray(12, 28);
// 	const { cipherText: hashExpected } = encryptEncode(gen, config.otpFSecret, iv.toString("base64url"));
// 	if (crypto.timingSafeEqual(Buffer.from(hashExpected, "base64url"), Buffer.from(store, "base64url"))) {
// 		return true;
// 	}
// 	else return false;
// };

const hashSessionToken = (token: string): string => {
	return crypto.createHmac("sha256", config.sSecret).update(token).digest("hex");
};

export {
	decryptEncode,
	encryptEncode,
	generateTokenPass,
	generateTokenReg,
	hashSessionToken,
	verifyTokenPass,
	verifyTokenReg,
};
