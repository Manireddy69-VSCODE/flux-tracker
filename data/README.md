# Data Backups

This folder contains automated and manual backups of your app data.

## How it works:

1. **Auto-Export** - Every 5 minutes, your data is automatically downloaded as a JSON file
2. **Manual Export** - Click the **💾 Export Backup** button in the app to manually save a snapshot

## File Format:

Backup files are named: `flux-backup-YYYY-MM-DDTHH-MM-SS.json`

Each file contains:
- messages (journal entries)
- words (vocabulary vault)
- quotes (saved quotes)
- books (library)
- workouts (exercise log)

## To Restore:

1. Load your data in localStorage using browser DevTools, or
2. Delete localStorage and reload the app (it will use the blank state)

## Sharing:

Simply copy the entire `data` folder to an external device to share your progress!
