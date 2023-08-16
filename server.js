const mysql = require('mysql');

const server = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

server.connect(
    (error)=>{
        if(error){
            throw error;
        }
        else{
            console.log('Bases de datos cargadas.');
        }
    }
);

function getGroup(id){
    return new Promise((resolve, reject)=>{
        let request =
        `SELECT *
        FROM grupos
        WHERE id = '${id}'`

        server.query(request, (error, result)=>{
            if(error) throw error;
            const data = (result.length > 0)? result[0] : undefined;
            resolve(data);
        });
    });
}

function addGroup(id, user, inviteCode){
    return new Promise((resolve, reject)=>{
        let insert =
        `INSERT INTO grupos(id, user, joinedTime, inviteCode)
        VALUES ('${id}','${user}','${Math.floor(Date.now()/1000)}','${inviteCode}')`

        server.query(insert, async(error, result)=>{
            if(error) throw error;
            resolve(await getGroup(id));
        });
    });
}

function updateGroup(id){
    return new Promise((resolve, reject)=>{
        let update =
        `UPDATE grupos
        SET
        lastMessageTime = ${Math.floor(Date.now()/1000)},
        messageCount = messageCount + 1
        WHERE id = '${id}'`

        server.query(update, (error, result)=>{
            if(error) throw error;
            resolve();
        });
    });
}

module.exports = {
    getGroup,
    addGroup,
    updateGroup
};