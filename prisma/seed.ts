const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean slate
  await prisma.question.deleteMany()
  await prisma.testSet.deleteMany()

  // Sample test 1
  const test1 = await prisma.testSet.create({
    data: {
      title: 'SQL Fundamentals',
      description: 'Test your knowledge of SQL basics — joins, keys, and queries.',
      slug: 'sql-fundamentals',
      timeLimit: 10,
      published: true,
    },
  })

  const sqlQuestions = [
    {
      questionText: 'What does an INNER JOIN return?',
      optionA: 'All rows from both tables',
      optionB: 'Only matching rows',
      optionC: 'Only left table rows',
      optionD: 'Only right table rows',
      answer: 'B',
      order: 0,
    },
    {
      questionText: 'What is a primary key?',
      optionA: 'A duplicate column',
      optionB: 'A unique identifier for each row',
      optionC: 'A foreign table',
      optionD: 'A sorting rule',
      answer: 'B',
      order: 1,
    },
    {
      questionText: 'Which SQL clause filters grouped results?',
      optionA: 'WHERE',
      optionB: 'LIMIT',
      optionC: 'HAVING',
      optionD: 'ORDER BY',
      answer: 'C',
      order: 2,
    },
    {
      questionText: 'What does SELECT DISTINCT do?',
      optionA: 'Sorts the results',
      optionB: 'Removes duplicate rows',
      optionC: 'Joins two tables',
      optionD: 'Deletes selected rows',
      answer: 'B',
      order: 3,
    },
    {
      questionText: 'Which join returns all rows from the left table and matched rows from the right?',
      optionA: 'INNER JOIN',
      optionB: 'RIGHT JOIN',
      optionC: 'LEFT JOIN',
      optionD: 'FULL JOIN',
      answer: 'C',
      order: 4,
    },
  ]

  for (const q of sqlQuestions) {
    await prisma.question.create({
      data: { ...q, testSetId: test1.id },
    })
  }

  // Sample test 2
  const test2 = await prisma.testSet.create({
    data: {
      title: 'React & Web Dev',
      description: 'Key concepts in React, HTTP, and modern web development.',
      slug: 'react-web-dev',
      timeLimit: 8,
      published: true,
    },
  })

  const reactQuestions = [
    {
      questionText: 'What happens when state changes in React?',
      optionA: 'The app closes',
      optionB: 'The UI re-renders',
      optionC: 'The database deletes data',
      optionD: 'The browser stops working',
      answer: 'B',
      order: 0,
    },
    {
      questionText: 'Which HTTP status code means "Not Found"?',
      optionA: '401',
      optionB: '403',
      optionC: '404',
      optionD: '500',
      answer: 'C',
      order: 1,
    },
    {
      questionText: 'What does the repository layer handle?',
      optionA: 'UI animations',
      optionB: 'Database queries',
      optionC: 'User login pages',
      optionD: 'API documentation',
      answer: 'B',
      order: 2,
    },
    {
      questionText: 'What is a React hook?',
      optionA: 'A CSS animation',
      optionB: 'A database trigger',
      optionC: 'A function that lets you use React features in functional components',
      optionD: 'A type of SQL join',
      answer: 'C',
      order: 3,
    },
    {
      questionText: 'Which HTTP method is used to create a new resource?',
      optionA: 'GET',
      optionB: 'DELETE',
      optionC: 'PATCH',
      optionD: 'POST',
      answer: 'D',
      order: 4,
    },
  ]

  for (const q of reactQuestions) {
    await prisma.question.create({
      data: { ...q, testSetId: test2.id },
    })
  }

  console.log('✅ Seeded 2 tests with 5 questions each.')
  console.log(`   → SQL Fundamentals (slug: sql-fundamentals)`)
  console.log(`   → React & Web Dev  (slug: react-web-dev)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
