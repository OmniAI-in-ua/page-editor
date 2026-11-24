declare module 'hypher' {
  export default class Hypher {
    constructor(language: unknown)
    hyphenate(word: string): string[]
  }
}

declare module 'hyphenation.uk' {
  const patterns: unknown
  export default patterns
}
