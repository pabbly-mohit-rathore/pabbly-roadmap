const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    const email = 'mohit.rathore@pabbly.com';

    console.log(`\n🔍 Looking for user: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found!`);
      console.log('\n📝 First register/login karo, phir ye script chalao!');
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name}`);
    console.log(`📋 Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log(`\n🎉 Already ADMIN!`);
      process.exit(0);
    }

    console.log(`\n⚙️  Updating to ADMIN...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    });

    console.log(`\n✅ SUCCESS! ${updatedUser.email} is now ADMIN`);
    console.log(`\n🎉 Ab ye karo:`);
    console.log(`1. Browser refresh karo`);
    console.log(`2. Auto-redirect hoga /admin/dashboard par`);
    console.log(`3. Admin UI dikhega!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
