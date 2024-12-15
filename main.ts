import * as fs from "fs";
import * as readline from "readline";
import * as crypto from "crypto";
import bs58 from "bs58";
import { privateKeyToAddress, NetworkType, AddressType } from "./KeyToAdressConverter";

/**
 * Проверяет, является ли строка валидным Base58
 * @param input Строка для проверки
 * @returns true, если строка является валидным Base58
 */
function isBase58(input: string): boolean {
  try {
    bs58.decode(input);
    return true;
  } catch {
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
function convertToWIF(privateKeyHex: string, compressed = true, mainnet = true): string {
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
  return bs58.encode(wifBuffer);
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
    if (!wifOrHex) continue; // Пропускаем пустые строки

    try {
      let wif = wifOrHex;

      // Если строка не в формате Base58, преобразуем её в WIF
      if (!isBase58(wifOrHex)) {
        console.log(`Строка ${wifOrHex} не является Base58. Конвертируем в WIF.`);
        wif = convertToWIF(wifOrHex, true, true); // Конвертируем в WIF (mainnet, сжатый ключ)
      }

      // Преобразуем WIF в P2TR-адрес
      const address = privateKeyToAddress(wif, AddressType.P2TR, NetworkType.MAINNET);
      console.log(`WIF: ${wif} -> Address: ${address}`);
      outputStream.write(`${address}\n`); // Записываем адрес в файл
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Ошибка обработки строки: ${wifOrHex} - ${error.message}`);
      } else {
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
  } else {
    console.error("Неизвестная глобальная ошибка:", error);
  }
});
