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
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const crypto = __importStar(require("crypto"));
const bs58_1 = __importDefault(require("bs58"));
const KeyToAdressConverter_1 = require("./KeyToAdressConverter");
/**
 * Проверяет, является ли строка валидным Base58
 * @param input Строка для проверки
 * @returns true, если строка является валидным Base58
 */
function isBase58(input) {
    try {
        bs58_1.default.decode(input);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Преобразование строки приватного ключа в WIF
 * @param privateKeyHex Приватный ключ в формате HEX (32 байта)
 * @param compressed Указывает, использовать ли сжатый формат (по умолчанию true)
 * @param mainnet Указывает, использовать ли mainnet (по умолчанию true)
 * @returns Приватный ключ в формате WIF
 */
function convertToWIF(privateKeyHex, compressed = true, mainnet = true) {
    const prefix = mainnet ? "80" : "ef"; // Префикс: 0x80 для mainnet, 0xef для testnet
    const flag = compressed ? "01" : ""; // Флаг компрессии: 0x01 для сжатого ключа
    const data = Buffer.from(prefix + privateKeyHex + flag, "hex");
    // Контрольная сумма
    const hash1 = crypto.createHash("sha256").update(data).digest();
    const hash2 = crypto.createHash("sha256").update(hash1).digest();
    const checksum = hash2.slice(0, 4);
    // Склеиваем данные с контрольной суммой
    const wifBuffer = Buffer.concat([data, checksum]);
    // Конвертируем в Base58
    return bs58_1.default.encode(wifBuffer);
}
async function processWallets() {
    const inputFile = "wallets.txt";
    const outputFile = "public.txt";
    const inputStream = fs.createReadStream(inputFile, { encoding: "utf8" });
    const outputStream = fs.createWriteStream(outputFile, { flags: "w", encoding: "utf8" });
    const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });
    console.log("Начинаем обработку WIF-ключей...");
    for await (const line of rl) {
        const wifOrHex = line.trim();
        if (!wifOrHex)
            continue; // Пропускаем пустые строки
        try {
            let wif = wifOrHex;
            // Если строка не в формате Base58, преобразуем её в WIF
            if (!isBase58(wifOrHex)) {
                console.log(`Строка ${wifOrHex} не является Base58. Конвертируем в WIF.`);
                wif = convertToWIF(wifOrHex, true, true); // Конвертируем в WIF (mainnet, сжатый ключ)
            }
            // Преобразуем WIF в P2TR-адрес
            const address = (0, KeyToAdressConverter_1.privateKeyToAddress)(wif, KeyToAdressConverter_1.AddressType.P2TR, KeyToAdressConverter_1.NetworkType.MAINNET);
            console.log(`WIF: ${wif} -> Address: ${address}`);
            outputStream.write(`${address}\n`); // Записываем адрес в файл
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(`Ошибка обработки строки: ${wifOrHex} - ${error.message}`);
            }
            else {
                console.error(`Неизвестная ошибка при обработке строки: ${wifOrHex} -`, error);
            }
        }
    }
    outputStream.end();
    console.log(`Обработка завершена! Адреса записаны в файл: ${outputFile}`);
}
// Запуск основной функции
processWallets().catch((error) => {
    if (error instanceof Error) {
        console.error(`Глобальная ошибка: ${error.message}`);
    }
    else {
        console.error("Неизвестная глобальная ошибка:", error);
    }
});
