# How to Share Your Migration Dashboard

## 🌐 Option 1: Share the Live URL (Easiest & Recommended)

Your dashboard is already hosted and live! Simply copy and share the URL from your browser.

**URL Format:**
```
https://app-[your-unique-id].makeproxy-c.figma.site/
```

### Benefits:
- ✅ Fully interactive (filters, zoom, hover tooltips)
- ✅ Always up-to-date with your latest changes
- ✅ No installation required for viewers
- ✅ Works on any device (desktop, tablet, mobile)
- ✅ Free hosting through Figma Make

### How to Share:
1. Copy the URL from your browser address bar
2. Share via email, Slack, presentations, or embed in documentation
3. Recipients can view it immediately in any browser

---

## 📦 Option 2: Export Static Screenshots

For presentations or reports where interactivity isn't needed:

### Method A: Browser Screenshots
1. Open your dashboard
2. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
3. Type "screenshot" and select "Capture full size screenshot"
4. Save as PNG/JPG

### Method B: Print to PDF
1. Open dashboard in browser
2. Press `Ctrl+P` or `Cmd+P`
3. Select "Save as PDF" as destination
4. Adjust settings (landscape mode recommended)
5. Save the PDF

---

## 💾 Option 3: Download the Source Code

To run locally or deploy elsewhere:

### From Figma Make:
1. Click the "⋮" menu in Figma Make
2. Select "Download source code"
3. Extract the ZIP file
4. Run locally:
   ```bash
   npm install
   npm run dev
   ```

### Deploy to Your Own Server:
```bash
npm install
npm run build
# Upload the 'dist' folder to your web server
```

---

## 🚀 Option 4: Deploy to Popular Platforms

### Vercel (Recommended - Free):
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Click "Deploy" - Done!

### Netlify (Also Free):
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Select your repository
5. Deploy settings are auto-detected
6. Click "Deploy site"

### GitHub Pages (Free):
1. Push code to GitHub repository
2. Go to Settings → Pages
3. Select branch and folder (/docs or /root)
4. Save - Your site will be live at:
   `https://[username].github.io/[repo-name]`

---

## 🔗 Option 5: Embed in Other Websites

### Using an iFrame:
```html
<iframe 
  src="https://app-[your-id].makeproxy-c.figma.site/" 
  width="100%" 
  height="1200px"
  frameborder="0"
  title="Migration Dashboard">
</iframe>
```

### Embedding in:
- **WordPress**: Use "Custom HTML" block
- **Notion**: Use "/embed" command
- **Google Sites**: Insert → Embed URL
- **Confluence**: Insert → Other Macros → HTML

---

## 📊 Option 6: Export Data Only

If viewers just need the data:

### CSV Export:
Click the "Export as HTML" button in the dashboard to download data.

### For Custom Exports:
The raw CSV file is located at:
```
/src/imports/Push_Factors-_Difficulties_Faced_in_EU_Countries_-1.csv
```

---

## 🎯 Best Practices

### For Academic Presentations:
- ✅ Use the live URL for interactive demos
- ✅ Include QR code linking to dashboard
- ✅ Take screenshots for backup slides

### For Reports/Publications:
- ✅ Include static screenshots with captions
- ✅ Provide live URL in footnotes/references
- ✅ Export PDF for archival purposes

### For Stakeholder Sharing:
- ✅ Share live URL via email
- ✅ Record a quick video walkthrough
- ✅ Include brief usage instructions

---

## 🔒 Privacy & Security

### Current Setup:
- Dashboard is publicly accessible
- No authentication required
- Data is embedded in the application

### To Add Access Control:
1. Deploy to Vercel/Netlify
2. Add authentication (e.g., Vercel Password Protection)
3. Or host on private network/VPN

---

## 💡 Tips for Best Results

1. **For Presentations**: Open in fullscreen mode (F11)
2. **For Sharing**: Test the URL in incognito mode first
3. **For Embedding**: Ensure parent page allows iframes
4. **For Performance**: Large datasets work best on desktop browsers

---

## 📞 Need Help?

- The dashboard uses D3.js for visualizations
- Built with React + TypeScript
- Styled with Tailwind CSS
- All code is in `/src/app/components/`

---

## 🌟 Quick Reference

| Method | Best For | Interactive | Free |
|--------|----------|-------------|------|
| Live URL | General sharing | ✅ | ✅ |
| Screenshot | Static docs | ❌ | ✅ |
| PDF Export | Reports | ❌ | ✅ |
| Vercel Deploy | Custom domain | ✅ | ✅ |
| Embed iFrame | Websites | ✅ | ✅ |

**Recommended**: Share the live Figma Make URL for full interactivity!
