// Standard Revised Romanization of Korean (Hangul Syllables 0xAC00 - 0xD7A3)
const choseong = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const jungseong = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const jongseong = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']

const kanaMap: Record<string, string> = {
  // Hiragana Digraphs
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',

  // Katakana Digraphs
  キャ: 'kya', キュ: 'kyu', キョ: 'kyo',
  シャ: 'sha', シュ: 'shu', ショ: 'sho',
  チャ: 'cha', チュ: 'chu', チョ: 'cho',
  ニャ: 'nya', ニュ: 'nyu', ニョ: 'nyo',
  ヒャ: 'hya', ヒュ: 'hyu', ヒョ: 'hyo',
  ミャ: 'mya', ミュ: 'myu', ミョ: 'myo',
  リャ: 'rya', リュ: 'ryu', リョ: 'ryo',
  ギャ: 'gya', ギュ: 'gyu', ギョ: 'gyo',
  ジャ: 'ja', ジュ: 'ju', ジョ: 'jo',
  ビャ: 'bya', ビュ: 'byu', ビョ: 'byo',
  ピャ: 'pya', ピュ: 'pyu', ピョ: 'pyo',
  ティ: 'ti', ディ: 'di', トゥ: 'tu', ドゥ: 'du',
  ウィ: 'wi', ウェ: 'we', ウォ: 'wo',
  ファ: 'fa', フィ: 'fi', フェ: 'fe', フォ: 'fo',
  ヴァ: 'va', ヴィ: 'vi', ヴ: 'vu', ヴェ: 've', ヴォ: 'vo',

  // Hiragana
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',

  // Katakana
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o',
  カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko',
  サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so',
  タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no',
  ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo',
  ヤ: 'ya', ユ: 'yu', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro',
  ワ: 'wa', ヲ: 'wo', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go',
  ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo',
  ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do',
  バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo',
  パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po',
  'ー': '-'
}

export class RomajiHelper {
  static containsCJK(text: string): boolean {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(text)
  }

  static hangulToRomaji(text: string): string {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      if (code >= 0xac00 && code <= 0xd7a3) {
        const sIndex = code - 0xac00
        const lIndex = Math.floor(sIndex / (21 * 28))
        const vIndex = Math.floor((sIndex % (21 * 28)) / 28)
        const tIndex = sIndex % 28
        result += choseong[lIndex] + jungseong[vIndex] + jongseong[tIndex]
      } else {
        result += text[i]
      }
    }
    return result
  }

  static kanaToRomaji(input: string): string {
    let result = ''
    let i = 0
    while (i < input.length) {
      // Sokuon (っ / ッ)
      if (input[i] === 'っ' || input[i] === 'ッ') {
        if (i + 1 < input.length) {
          const nextTwo = input.substring(i + 1, Math.min(i + 3, input.length))
          const nextOne = input.substring(i + 1, i + 2)
          const nextRomaji = kanaMap[nextTwo] || kanaMap[nextOne]
          if (nextRomaji && nextRomaji.length > 0) {
            result += nextRomaji[0]
            i++
            continue
          }
        }
        i++
        continue
      }

      // Check digraphs (2 chars)
      if (i + 1 < input.length) {
        const two = input.substring(i, i + 2)
        if (kanaMap[two]) {
          result += kanaMap[two]
          i += 2
          continue
        }
      }

      // Check single char
      const one = input.substring(i, i + 1)
      if (kanaMap[one]) {
        result += kanaMap[one]
      } else {
        result += one
      }
      i++
    }
    return result
  }

  static toRomaji(text: string): string {
    if (!text || text.trim() === '') return text

    // 1. Convert Korean Hangul
    const koreanProcessed = this.hangulToRomaji(text)

    // 2. Convert Japanese Kana
    const kanaProcessed = this.kanaToRomaji(koreanProcessed)

    // Clean whitespace
    return kanaProcessed.replace(/\s+/g, ' ').trim()
  }
}
