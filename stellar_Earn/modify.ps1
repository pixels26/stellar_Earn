$content = Get-Content CONTRIBUTING.md
# Insert after line 348 (0-based index 347) - after the closing --- of section 4.4
$block = @(
    ''
    '---'
    ''
    '## 4.5 Type Ownership Guidelines (FE-062)'
    ''
    'Defining where DTOs, domain models, and view models live — and how they map to one another — keeps our backend/frontend contracts clean and our business logic in the right place.'
    ''
    '**Read the full guidelines:**'
    '[`docs/backend/type-ownership-guidelines.md`](docs/backend/type-ownership-guidelines.md)'
    ''
    'Briefly:'
    ''
    '- **DTOs** live in `BackEnd/src/modules/**/dto/` and define only API shape/validation.'
    '- **Domain models** are TypeORM entities (`BackEnd/src/modules/**/entities/`) and frontend domain interfaces (`FrontEnd/my-app/lib/types/`). They own business logic.'
    '- **View models** are UI-specific (`FrontEnd/my-app/lib/view-models/`). They contain computed fields, formatting, and UI state flags.'
    ''
    'When creating or modifying types, follow the migration checklist in the guidelines.'
    ''
    '---'
    ''
)
$first = $content[0..347]
$rest = $content[348..($content.Length-1)]
$content = $first + $block + $rest

# Update TOC: insert after line 16 (the Guards & Authorization line)
# Line numbers are 1-indexed; line 16 is index 15
$tocFirst = $content[0..15]
$tocRest = $content[16..($content.Length-1)]
$newItem = '    - [Type Ownership Guidelines](#45-type-ownership-guidelines)'
$content = $tocFirst + @($newItem) + $tocRest

Set-Content -Path CONTRIBUTING.md -Value $content