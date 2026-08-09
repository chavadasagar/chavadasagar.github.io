# build_data.ps1 - Process and optimize W3Schools dataset for TutorialStudio
$ErrorActionPreference = 'Stop'

$srcDir = "C:\Users\Pratham\Documents\antigravity\quick-hubble\data"
$outDataDir = "d:\sagar\chavadasagar.github.io\mysite\TutorialStudio\assets\data"
$outSubjectsDir = Join-Path $outDataDir "subjects"

if (-not (Test-Path $outSubjectsDir)) {
    New-Item -ItemType Directory -Path $outSubjectsDir -Force | Out-Null
}

Write-Host "Reading summary report and master index..."
$summary = Get-Content (Join-Path $srcDir "summary_report.json") -Raw | ConvertFrom-Json
$masterIndex = Get-Content (Join-Path $srcDir "w3schools_master_index.json") -Raw | ConvertFrom-Json

# Boilerplate section heading patterns to exclude
$boilerplatePatterns = @(
    "W3SCHOOLS TUTORIALS:",
    "W3SCHOOLS REFERENCES:",
    "Select another topic:",
    "W3SCHOOLS CERTIFICATES:",
    "All Our Services",
    "Contact Sales",
    "HTML Cert",
    "HTML References",
    "Video: ",
    "Track Your Progress",
    "Create a W3Schools Account",
    "that follows an inside #main",
    "Dark mode",
    "Sign in to track progress",
    "REMOVE ADS"
)

function Is-BoilerplateHeading($heading) {
    if ([string]::IsNullOrWhiteSpace($heading)) { return $true }
    $h = $heading.Trim()
    foreach ($pat in $boilerplatePatterns) {
        if ($h -eq $pat -or $h.StartsWith($pat) -or $h.Contains("W3SCHOOLS") -or $h.Contains("Sign in to track")) {
            return $true
        }
    }
    return $false
}

$subjectFiles = Get-ChildItem (Join-Path $srcDir "subjects") -Filter "*.json"

$allSubjectsList = [System.Collections.Generic.List[PSObject]]::new()
$allTopicsList = [System.Collections.Generic.List[PSObject]]::new()
$categoryMap = @{}

Write-Host "Processing $($subjectFiles.Count) subjects..."

foreach ($file in $subjectFiles) {
    $subSlug = $file.BaseName
    $rawTopics = Get-Content $file.FullName -Raw | ConvertFrom-Json
    
    if ($rawTopics.Count -eq 0) { continue }

    $firstTopic = $rawTopics[0]
    $subjectName = $firstTopic.subject
    $categoryName = $firstTopic.category

    if (-not $categoryMap.ContainsKey($categoryName)) {
        $categoryMap[$categoryName] = [System.Collections.Generic.List[PSObject]]::new()
    }

    $cleanedTopics = [System.Collections.Generic.List[PSObject]]::new()
    $topicIndexList = [System.Collections.Generic.List[PSObject]]::new()
    $subExamplesCount = 0

    foreach ($t in $rawTopics) {
        # Clean sections
        $validSections = [System.Collections.Generic.List[PSObject]]::new()
        if ($t.sections) {
            foreach ($sec in $t.sections) {
                if (-not (Is-BoilerplateHeading $sec.heading)) {
                    $c = if ($sec.content) { $sec.content.Trim() } else { "" }
                    if ($c.Length -gt 0) {
                        $validSections.Add([PSCustomObject]@{
                            heading = $sec.heading.Trim()
                            content = $c
                        })
                    }
                }
            }
        }

        # Code examples
        $validExamples = [System.Collections.Generic.List[PSObject]]::new()
        if ($t.code_examples) {
            foreach ($ex in $t.code_examples) {
                if ($ex.code -and $ex.code.Trim().Length -gt 0) {
                    $validExamples.Add([PSCustomObject]@{
                        heading = if ($ex.heading) { $ex.heading.Trim() } else { "Example" }
                        language = if ($ex.language) { $ex.language.ToLower().Trim() } else { "html" }
                        code = $ex.code
                        tryit_url = $ex.tryit_url
                    })
                }
            }
        }

        $subExamplesCount += $validExamples.Count

        $cleanedTopic = [PSCustomObject]@{
            topic_id = $t.topic_id
            title = $t.title
            subject = $subjectName
            subject_slug = $subSlug
            category = $categoryName
            summary = $t.summary
            url = $t.url
            sections = $validSections
            code_examples = $validExamples
            notes_and_tips = $t.notes_and_tips
        }

        $cleanedTopics.Add($cleanedTopic)

        $topicItem = [PSCustomObject]@{
            topic_id = $t.topic_id
            title = $t.title
            subject = $subjectName
            subject_slug = $subSlug
            category = $categoryName
            summary = $t.summary
            sections_count = $validSections.Count
            examples_count = $validExamples.Count
        }
        $allTopicsList.Add($topicItem)
        $topicIndexList.Add($topicItem)
    }

    # Save cleaned subject JSON & JS
    $jsonContent = $cleanedTopics | ConvertTo-Json -Depth 10 -Compress
    $outJsonPath = Join-Path $outSubjectsDir "$subSlug.json"
    [System.IO.File]::WriteAllText($outJsonPath, $jsonContent, [System.Text.Encoding]::UTF8)

    $varName = "SUBJECT_DATA_" + ($subSlug -replace '[^a-zA-Z0-9_]', '_').ToUpper()
    $jsContent = "window.$varName = $jsonContent;"
    $outJsPath = Join-Path $outSubjectsDir "$subSlug.js"
    [System.IO.File]::WriteAllText($outJsPath, $jsContent, [System.Text.Encoding]::UTF8)

    $subjectInfo = [PSCustomObject]@{
        slug = $subSlug
        name = $subjectName
        category = $categoryName
        topics_count = $cleanedTopics.Count
        examples_count = $subExamplesCount
        first_topic_id = $cleanedTopics[0].topic_id
        first_topic_title = $cleanedTopics[0].title
        topics = $topicIndexList
    }

    $allSubjectsList.Add($subjectInfo)
    $categoryMap[$categoryName].Add($subjectInfo)

    Write-Host "  -> Processed $subjectName ($subSlug): $($cleanedTopics.Count) topics, $subExamplesCount examples"
}

# Build Categories list
$categoriesList = [System.Collections.Generic.List[PSObject]]::new()
$catIcons = @{
    "HTML & CSS" = "code"
    "JavaScript & Frontend" = "layout"
    "Backend & Programming" = "server"
    "Data Science & AI" = "cpu"
    "Databases" = "database"
    "Web Tools & Security" = "shield"
}

$catDescriptions = @{
    "HTML & CSS" = "Master modern web markup, responsive design, styling, flexbox, grid, and animations."
    "JavaScript & Frontend" = "Build rich client-side applications with JavaScript, TypeScript, React, Vue, Angular, and more."
    "Backend & Programming" = "Server-side architectures, Python, Java, C++, C#, Go, Rust, PHP, Node.js and systems programming."
    "Data Science & AI" = "Artificial Intelligence, Machine Learning, NumPy, Pandas, Matplotlib, SciPy and data analytics."
    "Databases" = "Relational and NoSQL database management with SQL, MySQL, PostgreSQL, and MongoDB."
    "Web Tools & Security" = "Version control with Git, cyber security fundamentals, XML, JSON, and essential developer tools."
}

$totalExamplesOverall = 0
foreach ($s in $allSubjectsList) {
    $totalExamplesOverall += $s.examples_count
}

foreach ($catKey in $categoryMap.Keys) {
    $subs = $categoryMap[$catKey]
    $totalTopics = 0
    $totalEx = 0
    foreach ($s in $subs) {
        $totalTopics += $s.topics_count
        $totalEx += $s.examples_count
    }
    
    $categoriesList.Add([PSCustomObject]@{
        name = $catKey
        icon = if ($catIcons.ContainsKey($catKey)) { $catIcons[$catKey] } else { "book" }
        description = if ($catDescriptions.ContainsKey($catKey)) { $catDescriptions[$catKey] } else { "Explore topics in $catKey" }
        subjects_count = $subs.Count
        topics_count = $totalTopics
        examples_count = $totalEx
        subjects = $subs
    })
}

$catalog = [PSCustomObject]@{
    stats = [PSCustomObject]@{
        total_categories = $categoriesList.Count
        total_subjects = $allSubjectsList.Count
        total_topics = $allTopicsList.Count
        total_examples = $totalExamplesOverall
        generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    categories = $categoriesList
    subjects = $allSubjectsList
    all_topics = $allTopicsList
}

# Save master catalog
$catalogJson = $catalog | ConvertTo-Json -Depth 10 -Compress
$catalogJsonPath = Join-Path $outDataDir "catalog.json"
[System.IO.File]::WriteAllText($catalogJsonPath, $catalogJson, [System.Text.Encoding]::UTF8)

$catalogJsPath = Join-Path $outDataDir "catalog.js"
$catalogJsContent = "window.TUTORIAL_CATALOG = $catalogJson;"
[System.IO.File]::WriteAllText($catalogJsPath, $catalogJsContent, [System.Text.Encoding]::UTF8)

Write-Host "=========================================="
Write-Host "Successfully generated catalog and subject datasets!"
Write-Host "Total categories: $($categoriesList.Count)"
Write-Host "Total subjects: $($allSubjectsList.Count)"
Write-Host "Total topics: $($allTopicsList.Count)"
Write-Host "Total examples: $totalExamplesOverall"
Write-Host "=========================================="
