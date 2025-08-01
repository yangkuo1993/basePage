/**
 * Base64编码解码工具
 * 提供安全的Base64编码和解码功能，包含错误处理和类型定义
 */

/**
 * Base64编码错误类型
 */
export enum Base64ErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  DECODING_FAILED = 'DECODING_FAILED',
  ENCODING_FAILED = 'ENCODING_FAILED',
}

/**
 * Base64编码解码错误类
 */
export class Base64Error extends Error {
  type: Base64ErrorType

  constructor(message: string, type: Base64ErrorType) {
    super(message)
    this.name = 'Base64Error'
    this.type = type
    Object.setPrototypeOf(this, Base64Error.prototype)
  }
}

/**
 * 将字符串编码为Base64格式
 * @param input 要编码的字符串
 * @param urlSafe 是否使用URL安全的Base64编码（替换+为-，/为_，去除=）
 * @returns Base64编码后的字符串
 * @throws {Base64Error} 当输入无效或编码失败时抛出
 */
export function encodeBase64(input: string, urlSafe = false): string {
  try {
    if (typeof input !== 'string') {
      throw new Base64Error('输入必须是字符串', Base64ErrorType.INVALID_INPUT)
    }

    // 标准Base64编码
    let encoded = btoa(unescape(encodeURIComponent(input)))

    // 如果需要URL安全的编码
    if (urlSafe) {
      encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    return encoded
  } catch (error) {
    if (error instanceof Base64Error) {
      throw error
    }
    throw new Base64Error(
      `编码失败: ${error instanceof Error ? error.message : String(error)}`,
      Base64ErrorType.ENCODING_FAILED,
    )
  }
}

/**
 * 将Base64格式字符串解码为原始字符串
 * @param input 要解码的Base64字符串
 * @param urlSafe 是否是URL安全的Base64编码（会将-转换为+，_转换为/）
 * @returns 解码后的原始字符串
 * @throws {Base64Error} 当输入无效或解码失败时抛出
 */
export function decodeBase64(input: string, urlSafe = false): string {
  try {
    if (typeof input !== 'string') {
      throw new Base64Error('输入必须是字符串', Base64ErrorType.INVALID_INPUT)
    }

    let decodedInput = input

    // 如果是URL安全的编码，先转换为标准Base64
    if (urlSafe) {
      decodedInput = decodedInput.replace(/-/g, '+').replace(/_/g, '/')

      // 补充可能缺失的填充字符=
      const padLength = (4 - (decodedInput.length % 4)) % 4
      decodedInput += '='.repeat(padLength)
    }

    // 验证Base64格式
    if (!/^[A-Za-z0-9+/=]+$/.test(decodedInput)) {
      throw new Base64Error('输入不是有效的Base64字符串', Base64ErrorType.INVALID_INPUT)
    }

    // 解码
    return decodeURIComponent(escape(atob(decodedInput)))
  } catch (error) {
    if (error instanceof Base64Error) {
      throw error
    }
    throw new Base64Error(
      `解码失败: ${error instanceof Error ? error.message : String(error)}`,
      Base64ErrorType.DECODING_FAILED,
    )
  }
}

/**
 * 验证字符串是否为有效的Base64编码
 * @param input 要验证的字符串
 * @param urlSafe 是否考虑URL安全的Base64编码
 * @returns 如果是有效的Base64编码则返回true，否则返回false
 */
export function isValidBase64(input: string, urlSafe = false): boolean {
  if (typeof input !== 'string') {
    return false
  }

  let testInput = input

  if (urlSafe) {
    // URL安全的Base64不包含=，所以先处理填充
    const padLength = (4 - (testInput.length % 4)) % 4
    testInput += '='.repeat(padLength)
    // 转换为标准Base64字符
    testInput = testInput.replace(/-/g, '+').replace(/_/g, '/')
  }

  // 标准Base64验证正则
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  // 长度必须是4的倍数
  const lengthIsValid = testInput.length % 4 === 0
  // 填充字符=只能出现在最后，且最多2个
  const paddingIsValid = !/=.*=/.test(testInput.replace(/={1,2}$/, ''))

  return base64Regex.test(testInput) && lengthIsValid && paddingIsValid
}
