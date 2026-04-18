# VRAJ Education

A full-stack MCQ test platform built with **Next.js 14**, **Prisma**, and **MongoDB Atlas**.

## ✨ Features

- 📝 Create and manage test sets with questions
- ⏱️ Timed tests with live countdown timer
- 📥 Bulk import MCQs from **PDF**, **Word (.docx)**, or **pasted text** with a built-in parser
- 📊 Instant scoring with detailed question-by-question review
- 🔒 Password-protected admin panel
- 🌙 Beautiful dark theme UI

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/mcq_platform?retryWrites=true&w=majority&appName=Cluster0"
ADMIN_PASSWORD="your-secret-password"
```

### 3. Set up the database

```bash
npm run db:push
```

### 4. (Optional) Seed sample data

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Taking a Test
1. Go to the home page at `/`
2. Click any published test
3. Read the intro screen, then click **Start Test**
4. Answer questions one by one — feedback shown after each answer
5. See your score and full review at the end

### Admin Panel
1. Go to `/admin`
2. Login with your admin password (default: `admin123`)
3. Create a new test set → give it a title, description, and time limit
4. Add questions manually **or** use Bulk Import

### Bulk Import
- **Paste Text**: Paste MCQs in numbered format with options A/B/C/D
- **Upload File**: Upload a `.pdf` or `.docx` file and extract MCQs automatically
- Review extracted questions before saving
- Delete any incorrect ones before importing

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | MongoDB Atlas via Prisma |
| Import Parsing | Built-in parser (no external API key) |
| Styling | Tailwind CSS |
| Fonts | Playfair Display + DM Sans |
| File Parsing | pdf-parse + mammoth |

## 📁 Project Structure

```
app/
  page.tsx              — Home (test list)
  admin/                — Admin panel (login, test manager, import)
  test/[slug]/          — Test taking UI + results
  api/
    tests/              — CRUD for test sets
    questions/          — CRUD for questions
    import/             — AI-powered MCQ extraction
    admin-auth/         — Password check

lib/
  prisma.ts             — Database client
  utils.ts              — Slug + time helpers

prisma/
  schema.prisma         — Data models
  seed.ts               — Sample data
```

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
  - `DATABASE_URL`
  - `ADMIN_PASSWORD`
4. Run Prisma push against MongoDB before first use:

```bash
npx prisma db push
```

## 🔧 Changing the Admin Password

Update `ADMIN_PASSWORD` in your `.env` file and restart the server.

## 📝 License

MIT
