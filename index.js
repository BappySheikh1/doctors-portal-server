const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app =express();
const jwt =require('jsonwebtoken');
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())



const uri = process.env.MONGODB_ACCESS_TOKEN;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const appointmentOptionCollection=client.db("doctorsPortal").collection('apoinntmentOptions');
        const bookingCollection=client.db("doctorsPortal").collection('bookings');
        const usersCollection=client.db("doctorsPortal").collection('users');
        
        // Use aggregate to query multiple collection and then merge data 
        app.get('/appointmentOptions',async (req,res)=>{
            const date=req.query.date;
            const query={};
            const options =await appointmentOptionCollection.find(query).toArray();
          
            // get the bookings of the provided date  
            const bookingQuery={appointmentDate: date};
            const alreadyBooked=await bookingCollection.find(bookingQuery).toArray();
          
            // code carefully :D
            options.forEach(option =>{
             const optionBooked=alreadyBooked.filter(book => book.treatment === option.name)
             const bookSlots = optionBooked.map(book => book.slot)
             const remainingSlots=option.slots.filter(slot => !bookSlots.includes(slot))
             option.slots = remainingSlots 
            })
            res.send(options)
        });

        /**
         *API Naming Convention
         * app.get('/bookings')
         * app.get('/bookings/:id')
         * app.post('/bookings')
         * app.patch('/bookings/:id')
         * app.delete('/bookings/:id')
         *  
         */ 
        app.get('/bookings',async (req,res)=>{
          const email =req.query.email
          const query ={email : email}
          const bookings=await bookingCollection.find(query).toArray()
          res.send(bookings) 
        })
         
        app.post('/bookings',async(req,res)=>{
            const booking=req.body
              
            const query={
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment
            }
           
            const alreadyBooked =await bookingCollection.find(query).toArray();
            if(alreadyBooked.length){
            const message = `You already have a booking on ${booking.appointmentDate}`
            return res.send({acknowledged: false,message})
            }

            const result =await bookingCollection.insertOne(booking)
            res.send(result)
        });


       app.post('/users',async (req,res)=>{
        const user =req.body
        console.log(user);
        const result =await usersCollection.insertOne(user)
        res.send(result)

       })

    }
    finally{

    }
}
run().catch(err => console.log(err))


app.get('/',(req,res)=>{
    res.send('doctors portal server is running')
})

app.listen(port,()=>{
    console.log(`doctors portal is running in port ${port}`);
})