# CMS Edit Guide

This repo uses GitHub Issues to update JSON data.

## Issue Format (Required)
Put this YAML in the Issue body (code fence recommended):

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

## 1) site.json (target: site)
Only `set_site` is allowed.

Common paths:
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

Example:
```yaml
CMS_UPDATE: true
target: site
changes:
  - op: set_site
    path: "sections.profile.title"
    value: "Profile"
```

## 2) projects.json (target: project)
Use `add_project`, `update_project`, or `delete_project`.

Project ID is required for update/delete:
- id (string, unique)

Required-ish fields for display:
- id
- ticker
- market
- name
- sector
- thesis
- result
- role
- responsibilities
- tech (array)
- period
- teamSize
- skills (array)
- tags (array)
- skillGains (object)
- year

Examples:

Add:
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

Update:
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

Delete:
```yaml
CMS_UPDATE: true
target: project
changes:
  - op: delete_project
    id: "motion-commerce"
```

## Approval Rules
The issue is processed only when:
- Issue author has write permission, or
- Issue has the `approve` label

## Notes
- YAML block can be plain text or fenced with ```yaml.
- After update: JSON is updated, build runs, commit is pushed.
