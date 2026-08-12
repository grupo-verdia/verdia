# Rodovias Excel demo seed

Date: 2026-08-12

## What broke

Monday’s local app kept imported Excel rows in a file on disk. That file was never put on GitHub. The GitHub app starts with an empty memory store, so **Rodovias & planilhas** opened with no cards.

## Fix

Without Supabase, the app now loads the Motiva Excel template into memory on startup. Rodovias shows the sample rows (SP-330, SP-348, and others) until you import or clear.

Listing `rodoviaId=todas` returns every row, not an empty list.

## Test spreadsheet

Do not send a GitHub link — the browser can save a web page as `.xlsx`, and import then shows nothing.

In the app, click **Baixar planilha de teste**, then **Importar Excel**. If a confirm dialog appears, click **Limpar** first and import again.

