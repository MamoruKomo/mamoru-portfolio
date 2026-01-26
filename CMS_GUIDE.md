# CMS 編集ガイド

このリポジトリは GitHub Issue を使って JSON を更新します。

## Issue 本文フォーマット（必須）
以下の YAML を Issue 本文に入れてください（コードフェンス推奨）。

```yaml
CMS_UPDATE: true
target: site|project
changes:
  - op: set_site
    path: "sections.profile.title"
    value: "Profile"
  - op: add_project
    value: { id: "...", title: "...", ... }
  - op: update_project
    id: "..."
    patch: { title: "...", tech: ["..."] }
  - op: delete_project
    id: "..."
```

## 1) site.json（target: site）
`set_site` のみ許可されます。

よく使うパス:
- meta.name
- meta.title
- status.label
- ui.scrollHint
- ui.ticker.repeat
- ui.ticker.items.0.text
- ui.ticker.items.0.tone
- sections.profile.title
- sections.profile.subtitle
- sections.timeline.title
- sections.timeline.subtitle
- sections.activities.title
- sections.activities.subtitle
- sections.contact.title
- sections.contact.lead
- sections.contact.sublead
- sections.contact.note.prefix
- sections.contact.note.linkLabel
- sections.contact.note.suffix
- intro.photo
- intro.age
- intro.affiliation
- intro.headline
- intro.valueProposition
- intro.skills.0
- intro.links.0.label
- intro.links.0.url
- contact.email
- contact.mailSubject
- contact.form.privacyLabel
- contact.form.hint
- contact.form.submitLabel
- contact.form.directEmailLabel
- contact.form.rows.0.0
- contact.form.fields.name.label
- contact.form.fields.name.placeholder

例:
```yaml
CMS_UPDATE: true
target: site
changes:
  - op: set_site
    path: "sections.profile.title"
    value: "Profile"
```

## 2) projects.json（target: project）
`add_project` / `update_project` / `delete_project` を使います。

更新・削除には `id` が必要です。

表示に必要な主な項目:
- id
- ticker
- market
- name
- sector
- thesis
- result
- role
- responsibilities
- tech (配列)
- period
- teamSize
- skills (配列)
- tags (配列)
- skillGains (オブジェクト)
- year

例:

追加:
```yaml
CMS_UPDATE: true
target: project
changes:
  - op: add_project
    value:
      id: "new-project"
      ticker: "NEW"
      market: "SaaS"
      name: "New Project"
      sector: "SaaS / Analytics"
      thesis: "Short summary."
      result: "+12% activation"
      role: "UI/UX"
      responsibilities: "Research, wireframes, UI"
      tech: ["Figma", "React"]
      period: "2024.01 - 2024.04"
      teamSize: "3名"
      skills: ["UX Systems", "Frontend"]
      tags: ["Design", "Engineering"]
      skillGains:
        UX Systems: "+2"
        Frontend: "+1"
      year: "2024"
```

更新:
```yaml
CMS_UPDATE: true
target: project
changes:
  - op: update_project
    id: "motion-commerce"
    patch:
      result: "+30% conversion"
      tech: ["Figma", "After Effects"]
```

削除:
```yaml
CMS_UPDATE: true
target: project
changes:
  - op: delete_project
    id: "motion-commerce"
```

## 承認ルール
以下のどちらかを満たすと処理されます。
- Issue 作成者が write 権限以上
- Issue に `approve` ラベルが付いている

## 補足
- YAML はコードフェンスあり/なしどちらでも動きます。
- 更新後は JSON が書き換わり、ビルド→commit→push まで自動実行されます。
