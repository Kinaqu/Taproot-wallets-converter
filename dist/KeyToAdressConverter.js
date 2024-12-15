"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressType = exports.NetworkType = void 0;
exports.privateKeyToAddress = privateKeyToAddress;
exports.generateRandomAddress = generateRandomAddress;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const secp256k1_1 = __importDefault(require("@bitcoinerlab/secp256k1"));
const ecpair_1 = __importDefault(require("ecpair"));
const buffer_1 = require("buffer"); // Импорт для Buffer
bitcoin.initEccLib(secp256k1_1.default);
var NetworkType;
(function (NetworkType) {
    NetworkType[NetworkType["MAINNET"] = 0] = "MAINNET";
    NetworkType[NetworkType["TESTNET"] = 1] = "TESTNET";
})(NetworkType || (exports.NetworkType = NetworkType = {}));
var AddressType;
(function (AddressType) {
    AddressType[AddressType["P2PKH"] = 0] = "P2PKH";
    AddressType[AddressType["P2WPKH"] = 1] = "P2WPKH";
    AddressType[AddressType["P2TR"] = 2] = "P2TR";
})(AddressType || (exports.AddressType = AddressType = {}));
const ECPair = (0, ecpair_1.default)(secp256k1_1.default);
function toPsbtNetwork(networkType) {
    return networkType === NetworkType.MAINNET
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
}
function toXOnly(pubkey) {
    if (pubkey.length !== 33) {
        throw new Error("Public key length is not 33 bytes");
    }
    return pubkey.slice(1, 33);
}
function publicKeyToPayment(publicKey, type, networkType) {
    const network = toPsbtNetwork(networkType);
    const pubkey = buffer_1.Buffer.from(publicKey, "hex");
    if (type === AddressType.P2TR) {
        // Для Taproot требуется X-only ключ
        if (pubkey.length !== 32) {
            throw new Error("Taproot requires a 32-byte X-only public key");
        }
        return bitcoin.payments.p2tr({
            internalPubkey: pubkey,
            network,
        });
    }
    else if (type === AddressType.P2WPKH) {
        return bitcoin.payments.p2wpkh({ pubkey, network });
    }
    else if (type === AddressType.P2PKH) {
        return bitcoin.payments.p2pkh({ pubkey, network });
    }
    throw new Error("Unsupported address type");
}
function publicKeyToAddress(publicKey, type, networkType) {
    const payment = publicKeyToPayment(publicKey, type, networkType);
    if (payment && payment.address) {
        return payment.address;
    }
    else {
        throw new Error("Failed to generate address from public key");
    }
}
function privateKeyToAddress(wif, type = AddressType.P2TR, networkType = NetworkType.TESTNET) {
    const network = toPsbtNetwork(networkType);
    const keyPair = ECPair.fromWIF(wif, network);
    if (!keyPair.publicKey) {
        throw new Error("Public key is undefined");
    }
    // Преобразуем publicKey в Buffer, если это Uint8Array
    const pubkey = buffer_1.Buffer.isBuffer(keyPair.publicKey)
        ? keyPair.publicKey
        : buffer_1.Buffer.from(keyPair.publicKey);
    // Используем X-only формат для P2TR
    const xOnlyPubkey = type === AddressType.P2TR ? toXOnly(pubkey) : pubkey;
    const publicKeyHex = xOnlyPubkey.toString("hex");
    return publicKeyToAddress(publicKeyHex, type, networkType);
}
function generateRandomAddress(type = AddressType.P2TR, networkType = NetworkType.TESTNET) {
    const network = toPsbtNetwork(networkType);
    const keyPair = ECPair.makeRandom({ network });
    const wif = keyPair.toWIF();
    const address = privateKeyToAddress(wif, type, networkType);
    return { wif, address };
}
