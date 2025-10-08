export const formatMsg = (msg: string) => {
    // <think>\n\n</think>\n\n俄罗斯方块游戏生成器
     const thinkBlockPattern = /```<think>\s*\n([\s\S]*?)<\/think>$/ig
    return msg.trim().replace(`<think>\n\n</think>\n\n`, '')
}
