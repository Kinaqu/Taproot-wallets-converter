import * as bitcoin from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import ECPairFactory from "ecpair";
import { Buffer } from "buffer"; // Импорт для Buffer

bitcoin.initEccLib(ecc);

export enum NetworkType {
  MAINNET,
  TESTNET,
}

export enum AddressType {
  P2PKH,
  P2WPKH,
  P2TR,
}

const ECPair = ECPairFactory(ecc);

function toPsbtNetwork(networkType: NetworkType) {
  return networkType === NetworkType.MAINNET
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;
}

function toXOnly(pubkey: Buffer): Buffer {
  if (pubkey.length !== 33) {
    throw new Error("Public key length is not 33 bytes");
  }
  return pubkey.slice(1, 33);
}


function publicKeyToPayment(
  publicKey: string,
  type: AddressType,
  networkType: NetworkType
) {
  const network = toPsbtNetwork(networkType);
  const pubkey = Buffer.from(publicKey, "hex");

  if (type === AddressType.P2TR) {
    // Для Taproot требуется X-only ключ
    if (pubkey.length !== 32) {
      throw new Error("Taproot requires a 32-byte X-only public key");
    }
    return bitcoin.payments.p2tr({
      internalPubkey: pubkey,
      network,
    });
  } else if (type === AddressType.P2WPKH) {
    return bitcoin.payments.p2wpkh({ pubkey, network });
  } else if (type === AddressType.P2PKH) {
    return bitcoin.payments.p2pkh({ pubkey, network });
  }

  throw new Error("Unsupported address type");
}


function publicKeyToAddress(
  publicKey: string,
  type: AddressType,
  networkType: NetworkType
): string {
  const payment = publicKeyToPayment(publicKey, type, networkType);
  if (payment && payment.address) {
    return payment.address;
  } else {
    throw new Error("Failed to generate address from public key");
  }
}

export function privateKeyToAddress(
  wif: string,
  type: AddressType = AddressType.P2TR,
  networkType: NetworkType = NetworkType.TESTNET
): string {
  const network = toPsbtNetwork(networkType);
  const keyPair = ECPair.fromWIF(wif, network);

  if (!keyPair.publicKey) {
    throw new Error("Public key is undefined");
  }

  // Преобразуем publicKey в Buffer, если это Uint8Array
  const pubkey = Buffer.isBuffer(keyPair.publicKey)
    ? keyPair.publicKey
    : Buffer.from(keyPair.publicKey);

  // Используем X-only формат для P2TR
  const xOnlyPubkey = type === AddressType.P2TR ? toXOnly(pubkey) : pubkey;

  const publicKeyHex = xOnlyPubkey.toString("hex");
  return publicKeyToAddress(publicKeyHex, type, networkType);
}




export function generateRandomAddress(
  type: AddressType = AddressType.P2TR,
  networkType: NetworkType = NetworkType.TESTNET
): { wif: string; address: string } {
  const network = toPsbtNetwork(networkType);
  const keyPair = ECPair.makeRandom({ network });
  const wif = keyPair.toWIF();
  const address = privateKeyToAddress(wif, type, networkType);
  return { wif, address };
}
