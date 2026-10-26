import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Splitwise database...');

  // Clean existing data
  await prisma.activity.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Chen',
      email: 'alice@example.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    },
  });

  const dana = await prisma.user.create({
    data: {
      name: 'Dana Scully',
      email: 'dana@example.com',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    },
  });

  console.log('Created 4 demo users');

  // 2. Create Group 1: Apartment
  const aptGroup = await prisma.group.create({
    data: {
      name: 'Sunset Heights Apt 4B',
      description: 'Rent, utilities, and common household supplies',
      category: 'apartment',
      simplifyDebts: true,
      members: {
        create: [
          { userId: alice.id, role: 'admin' },
          { userId: bob.id, role: 'member' },
          { userId: charlie.id, role: 'member' },
        ],
      },
    },
  });

  // Expenses for Apartment
  const expRent = await prisma.expense.create({
    data: {
      groupId: aptGroup.id,
      payerId: alice.id,
      description: 'October Apartment Rent',
      amount: 2400.0,
      category: 'Rent',
      splitType: 'EQUAL',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      splits: {
        create: [
          { userId: alice.id, amount: 800.0 },
          { userId: bob.id, amount: 800.0 },
          { userId: charlie.id, amount: 800.0 },
        ],
      },
    },
  });

  const expWifi = await prisma.expense.create({
    data: {
      groupId: aptGroup.id,
      payerId: bob.id,
      description: 'Gigabit Fiber Internet',
      amount: 90.0,
      category: 'Utilities',
      splitType: 'EQUAL',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      splits: {
        create: [
          { userId: alice.id, amount: 30.0 },
          { userId: bob.id, amount: 30.0 },
          { userId: charlie.id, amount: 30.0 },
        ],
      },
    },
  });

  const expGroceries = await prisma.expense.create({
    data: {
      groupId: aptGroup.id,
      payerId: charlie.id,
      description: "Trader Joe's Household Restock",
      amount: 120.0,
      category: 'Groceries',
      splitType: 'EQUAL',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      splits: {
        create: [
          { userId: alice.id, amount: 40.0 },
          { userId: bob.id, amount: 40.0 },
          { userId: charlie.id, amount: 40.0 },
        ],
      },
    },
  });

  // Bob settled up $300 to Alice
  await prisma.settlement.create({
    data: {
      groupId: aptGroup.id,
      fromUserId: bob.id,
      toUserId: alice.id,
      amount: 300.0,
      paymentMethod: 'Bank Transfer',
      notes: 'Partial payment towards October rent',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Group 2: Trip
  const tripGroup = await prisma.group.create({
    data: {
      name: 'Lake Tahoe Ski Trip ⛷️',
      description: 'Weekend cabin, ski lift tickets & campfire bbq',
      category: 'trip',
      simplifyDebts: true,
      members: {
        create: [
          { userId: alice.id, role: 'admin' },
          { userId: bob.id, role: 'member' },
          { userId: dana.id, role: 'member' },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      groupId: tripGroup.id,
      payerId: dana.id,
      description: 'Lakeside Cabin Chalet',
      amount: 600.0,
      category: 'Travel',
      splitType: 'EQUAL',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      splits: {
        create: [
          { userId: alice.id, amount: 200.0 },
          { userId: bob.id, amount: 200.0 },
          { userId: dana.id, amount: 200.0 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      groupId: tripGroup.id,
      payerId: alice.id,
      description: 'Group Lift Tickets & Equipment',
      amount: 330.0,
      category: 'Entertainment',
      splitType: 'EXACT',
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      splits: {
        create: [
          { userId: alice.id, amount: 110.0 },
          { userId: bob.id, amount: 110.0 },
          { userId: dana.id, amount: 110.0 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      groupId: tripGroup.id,
      payerId: bob.id,
      description: 'Campfire BBQ & Drinks',
      amount: 150.0,
      category: 'Food & Drink',
      splitType: 'PERCENT',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      splits: {
        create: [
          { userId: alice.id, amount: 60.0, share: 40 },
          { userId: bob.id, amount: 45.0, share: 30 },
          { userId: dana.id, amount: 45.0, share: 30 },
        ],
      },
    },
  });

  // Activities
  await prisma.activity.createMany({
    data: [
      {
        groupId: aptGroup.id,
        userId: alice.id,
        type: 'GROUP_CREATED',
        title: 'Alice created group "Sunset Heights Apt 4B"',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        groupId: aptGroup.id,
        userId: alice.id,
        type: 'EXPENSE_ADDED',
        title: 'Alice added "October Apartment Rent" ($2,400.00)',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        groupId: aptGroup.id,
        userId: bob.id,
        type: 'SETTLEMENT_RECORDED',
        title: 'Bob paid Alice $300.00 via Bank Transfer',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
