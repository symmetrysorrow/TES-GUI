# TESの解析ツール
IVやRTの結果解析、波形の確認やヒストグラム、散布図などを作成可能。分解能の算出はできないので注意。

## 使い方
- 調べたいフォルダを開くかドロップすると、自動で解析する。あとはご自由に。
- 右上の印刷ボタンでグラフの出力が可能。

# 注意点
2025/07/23時点での解析ツールなので、今後labviewの開発状況によっては使えなくなる可能性がある。そしてこれを改修するのは困難を極める。そのため、もしこのツールを使いたい場合、このツールに合わせる形でのLabviewの開発をすることを勧める。もちろん、Rust+TypeSCriptに挑戦する場合は自由に複製してもらって構わない。

# 開発環境
Rust+TypeScriptをtauri v2で開発している。
