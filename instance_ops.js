const { sequelize, User, Contact } = require('./models');

(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();

        const a = User.build({ firstName: 'Ion', lastName: 'Ionescu', age: 30 });
        await a.save();
        console.log("User Ion Ionescu created!")

        const b = User.build({ firstName: 'Maria', lastName: 'Popescu' });
        b.lastName = 'Pop';
        await b.save();
        console.log("User Maria Pop created!");

        await a.update({ age: 31 });
        console.log("Ion Ionescu age changed to 31");

        a.firstName = 'Ionel';
        a.favouriteColor = 'blue';
        await a.save({ fields: ['favouriteColor'] });
        console.log("Ion Ionescu fav color changed to blue");

        await a.increment('age', { by: 2 });
        await a.reload();
        console.log("Ion Ionescu age incremented with 2 -> 33");

        const c = User.build({ firstName: 'Costel', lastName: 'Popescu' });
        await c.save();
        console.log("User Costel Popescu created!");
        await c.destroy();
        console.log("User Costel Popescu deleted!");

        const contact = await Contact.create({ email: 'ion.contact@gmail.com', phone: '+40 712 345 678', userId: a.id });
        console.log("Created contact (maskedPhone):", contact.maskedPhone, 'raw phone stored:', contact.phone);

        process.exit();
    } catch (e) {
        console.log(e);
        process.exit(1);
    }

})();