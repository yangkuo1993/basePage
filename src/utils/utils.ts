function splitPackets(input: string): string[] {
  const result = []
  let start = 0

  // 循环遍历整个字符串，找出所有匹配的分段
  while (start < input.length) {
    // 查找下一个 "4e53" 开头的位置（要求位置是偶数索引）
    const nextStart = input.indexOf('4e53', start)

    // 如果没有找到有效开头或者位置不是偶数索引，则结束循环
    if (nextStart === -1 || nextStart % 2 !== 0) {
      break
    }

    // 在当前开头的后面查找结尾 "0a"
    let end = nextStart + 4 // 跳过开头的"4e53"
    let found = false

    // 查找当前分段内的 "0a"（仅在偶数索引位置查找）
    while (end <= input.length - 2) {
      if (input.substring(end, end + 2) === '0a' && end % 2 === 0) {
        found = true
        break
      }
      end += 2 // 每次移动一个完整字节（2个字符）
    }

    // 如果找到结尾，则提取分段并加入结果数组
    if (found) {
      const segment = input.substring(nextStart, end + 2) // 包含整个分段
      result.push(segment)
      start = end + 2 // 移动到下一个分段的起始位置
    } else {
      break // 如果找不到结尾，结束循环
    }
  }

  return result
}

function extractHexSegments(input: string) {
  // 验证输入格式并提取目标字节段 [1,7](@ref)
  if (!input.startsWith('4e53') || input.length < 28) {
    throw new Error("输入格式无效：必须以'4e53'开头且长度不小于28字符")
  }

  // 提取4e53后的4个字节（8字符）
  const segment1 = input.substring(4, 12) // 索引4-12 → 1118f219
  // 反转字节序
  const reversedSegment1 = segment1.match(/.{2}/g)?.reverse().join('')

  // 提取segment1后的8个字节（16字符）
  const segment2 = input.substring(12, 28) // 索引12-28 → c10100000103011a

  return { id: reversedSegment1, data: segment2 }
}

export { splitPackets, extractHexSegments }
