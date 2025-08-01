import type { DataFormat } from './dataformat'

/**
 * 进制转换工具函数 - 支持字节序处理
 * @param value 要转换的值（字符串形式）
 * @param sourceBase 源进制，必须显式指定 'hex'、'dec' 或 'bin'
 * @param targetBase 目标进制，必须显式指定 'hex'、'dec' 或 'bin'
 * @param options 可选配置项
 * @param options.endian 字节序，'big'（大端）或 'little'（小端），默认为 'big'
 * @param options.bytePadding 字节对齐位数，必须是 8 的倍数，默认为 8
 * @returns 转换后的字符串，带对应进制前缀
 */
function convertBase(
  value: string,
  sourceBase: 'hex' | 'dec' | 'bin',
  targetBase: 'hex' | 'dec' | 'bin',
  options: {
    endian?: 'big' | 'little'
    bytePadding?: number
  } = {},
): string {
  const { endian = 'big', bytePadding = 8 } = options

  // 验证字节对齐位数
  if (bytePadding % 8 !== 0 || bytePadding <= 0) {
    throw new Error('bytePadding 必须是 8 的正整数倍')
  }

  // 移除可能存在的前缀并转换为十进制
  const cleanValue = value.replace(/^0x|^0b/i, '')
  let decimalValue: number

  // 根据源进制解析为十进制
  switch (sourceBase) {
    case 'hex':
      decimalValue = parseInt(cleanValue, 16)
      break
    case 'dec':
      decimalValue = parseInt(cleanValue, 10)
      break
    case 'bin':
      decimalValue = parseInt(cleanValue, 2)
      break
    default:
      throw new Error(`Unsupported source base: ${sourceBase}`)
  }

  // 检查解析结果是否有效
  if (isNaN(decimalValue)) {
    throw new Error(`Invalid ${sourceBase} value: ${value}`)
  }

  // 十进制转目标进制（处理字节序）
  if (targetBase === 'dec') {
    // 处理字节序（先转换为目标进制字符串，再转回十进制）
    const baseString = decimalValue.toString(16).toUpperCase()
    let processedString = baseString

    // 确保十六进制是字节对齐
    if (processedString.length % 2 !== 0) {
      processedString = '0' + processedString
    }

    // 应用字节序
    if (endian === 'little') {
      let reversed = ''
      for (let i = processedString.length; i > 0; i -= 2) {
        reversed += processedString.substring(Math.max(0, i - 2), i)
      }
      processedString = reversed
    }

    // 重新解析为十进制
    return parseInt(processedString, 16).toString(10)
  }

  // 转换为目标进制字符串
  let baseString: string
  switch (targetBase) {
    case 'hex':
      baseString = decimalValue.toString(16).toUpperCase()
      // 确保十六进制是字节对齐（2个字符=1字节）
      if (baseString.length % 2 !== 0) {
        baseString = '0' + baseString
      }
      break
    case 'bin':
      baseString = decimalValue.toString(2)
      // 确保二进制是字节对齐
      const padding = bytePadding - (baseString.length % bytePadding)
      if (padding < bytePadding) {
        baseString = '0'.repeat(padding) + baseString
      }
      break
    default:
      throw new Error(`Unsupported target base: ${targetBase}`)
  }

  // 处理字节序
  if (endian === 'little') {
    if (targetBase === 'hex') {
      // 按字节反转（每2个字符为1字节）
      let reversed = ''
      for (let i = baseString.length; i > 0; i -= 2) {
        reversed += baseString.substring(Math.max(0, i - 2), i)
      }
      baseString = reversed
    } else if (targetBase === 'bin') {
      console.log('走到这里了')
      // 按字节反转（每bytePadding位为1字节）
      const bytes = []
      for (let i = 0; i < baseString.length; i += bytePadding) {
        bytes.push(baseString.substring(i, i + bytePadding))
      }
      baseString = bytes.reverse().join('')
    }
  }

  // 添加前缀并返回
  return targetBase === 'hex' ? '0x' + baseString : '0b' + baseString
}

/**
 * 十六进制字符串转换工具
 * @param hexString 输入的十六进制字符串（允许带或不带 0x 前缀）
 * @param format 目标格式
 * @param options 可选配置
 * @param options.endian 字节序，'big'（大端）或 'little'（小端），默认为 'big'
 * @returns 转换后的值
 */
function hexTo(
  format: DataFormat,
  hexString: string,
  options: { endian?: 'big' | 'little' } = {},
): number | string | number[] {
  const { endian = 'big' } = options
  const cleanHex = hexString.replace(/^0x/i, '')

  // 验证十六进制字符串有效性
  if (!/^[0-9A-Fa-f]+$/.test(cleanHex)) {
    throw new Error('Invalid hexadecimal string')
  }

  // 转换为字节数组
  const bytes: number[] = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.substr(i, 2), 16)
    bytes.push(byte)
  }

  // 处理字节序
  if (endian === 'little') {
    bytes.reverse()
  }

  // 根据目标格式转换
  switch (format) {
    case 'array':
      return bytes

    case 'ascii':
      return bytes.map((b) => String.fromCharCode(b)).join('')

    case 'u8':
      if (bytes.length < 1) throw new Error('Insufficient bytes for u8')
      return bytes[0]

    case 's8':
      if (bytes.length < 1) throw new Error('Insufficient bytes for s8')
      return bytes[0] > 127 ? bytes[0] - 256 : bytes[0]

    case 'u16':
      if (bytes.length < 2) throw new Error('Insufficient bytes for u16')
      return (bytes[0] << 8) | bytes[1]

    case 's16':
      if (bytes.length < 2) throw new Error('Insufficient bytes for s16')
      const u16 = (bytes[0] << 8) | bytes[1]
      return u16 > 32767 ? u16 - 65536 : u16

    case 'u32':
      if (bytes.length < 4) throw new Error('Insufficient bytes for u32')
      return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]

    case 's32':
      if (bytes.length < 4) throw new Error('Insufficient bytes for s32')
      const u32 = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
      return u32 > 2147483647 ? u32 - 4294967296 : u32

    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

export { convertBase, hexTo }
