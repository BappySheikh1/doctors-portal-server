const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app =express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const jwt =require('jsonwebtoken');
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())



const uri = process.env.MONGODB_ACCESS_TOKEN;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function jwtVerify(req,res,next){
  const authHeader=req.headers.authorization
  if(!authHeader){
  return res.status(401).send('unAuthorization access')
  }
  const token =authHeader.split(' ')[1]
  jwt.verify(token,process.env.ACCESS_JWT_TOKEN,function(err,decoded){
    if(err){
        return res.status(403).send({message:"Forbidden access"})
    }
    req.decoded =decoded
    next()
  })
}
async function run(){
    try{
        const appointmentOptionCollection=client.db("doctorsPortal").collection('apoinntmentOptions');
        const bookingCollection=client.db("doctorsPortal").collection('bookings');
        const usersCollection=client.db("doctorsPortal").collection('users');
        const doctorsCollection=client.db("doctorsPortal").collection('doctors');
        const paymentsCollection=client.db("doctorsPortal").collection('payments');
        
        // make sure you run verifyAdmin after verify jwt
        const verifyAdmin= async(req,res,next)=>{
            const decodedEmail =req.decoded
            const query={email: decodedEmail}
           const user =await usersCollection.findOne(query)
           if(user?.role !== 'admin'){
             return res.status(403).send({message:'Forbidden access'})
           }
          next();
        }
  


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
       
        app.get('/appointmentSpecialty',async (req,res)=>{
            const query ={}
            const result= await appointmentOptionCollection.find(query).project({name: 1}).toArray()
            res.send(result)
        })
        /**
         *API Naming Convention
         * app.get('/bookings')
         * app.get('/bookings/:id')
         * app.post('/bookings')
         * app.patch('/bookings/:id')
         * app.delete('/bookings/:id')
         *  
         */ 
        app.get('/bookings',jwtVerify,async (req,res)=>{
          const email =req.query.email
          const decodedEmail =req.decoded.email
          if(email !==decodedEmail){
            return res.status(403).send({message: 'Forbidden Access'})
          }
          const query ={email : email}
          const bookings=await bookingCollection.find(query).toArray()
          res.send(bookings) 
        })
        app.get('/bookings/:id',async (req,res)=>{
            const id =req.params.id
            const query ={_id:ObjectId(id)}
            const booking =await bookingCollection.findOne(query)
            res.send(booking)
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
     
        app.get('/jwt',async(req,res)=>{
            const email =req.query.email;
            const query={email: email}
            const user =await usersCollection.findOne(query)
            if(user){
                const token =jwt.sign({email},process.env.ACCESS_JWT_TOKEN,{expiresIn:'365d'})
                return res.send({accessToken: token})
            }
            // console.log(user);
            res.status(403).send({message:'Forbidden Access'})
        })

        app.post('/create_payment_intent',async (req,res)=>{
            const booking =req?.body
            const price =booking?.price
            const amount = price * 100

            const paymentIntent =await stripe?.paymentIntents?.create({
                currency: 'usd',
                amount: amount ,
                "payment_method_types": [
                    "card"
                  ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
              });
        })

        app.post('/payments',async (req,res)=>{
            const payment =req.body
            const result =await paymentsCollection.insertOne(payment)
            const _id =payment.bookingId
            const filter ={_id: ObjectId(_id)}
            const updatedoc ={
                $set:{
                    paid: true,
                    transactionId:payment.transactionId
                }
            }
            const updatedResult =await bookingCollection.updateOne(filter,updatedoc)
            res.send(result)
        })

       app.get('/users',async(req,res)=>{
        const query ={}
        const user =await usersCollection.find(query).toArray()
        res.send(user)
       })
       
       app.get('/users/admin/:email', async (req,res)=>{
        const email=req.params.email
        const query ={email}
        const user =await usersCollection.findOne(query)
        res.send({isAdmin: user?.role === 'admin'});
       })

       app.post('/users',async (req,res)=>{
        const user =req.body
        // console.log(user);
        const result =await usersCollection.insertOne(user)
        res.send(result)

       })
       
       app.put('/users/admin/:id',jwtVerify,verifyAdmin, async(req,res)=>{
       
        const id =req.params.id
        const filter ={_id: ObjectId(id)}
        const options ={upsert: true}
        const updateDoc={
            $set:{
               role: 'admin'
            }
        }
        const result = await usersCollection.updateOne(filter,updateDoc,options)
        res.send(result)    
       })

    //    app.get('/addPrice',async(req,res)=>{
    //     const filter ={}
    //     const options ={upsert: true}
    //     const updateDoc={
    //         $set:{
    //            price: 99
    //         }
    //     }
    //     const result =await appointmentOptionCollection.updateMany(filter,updateDoc,options)
    //     res.send(result)
    //    })

       app.get('/doctors',jwtVerify, async (req,res)=>{
        const query ={}
        const doctors =await doctorsCollection.find(query).toArray()
        res.send(doctors)
       })
       app.post('/doctors',jwtVerify, async(req,res)=>{
        const doctor =req.body
        console.log(doctor);
        const result =await doctorsCollection.insertOne(doctor)
        res.send(result)
       })
       app.delete('/doctors/:id',jwtVerify,async (req,res)=>{
        const id =req.params.id
        const filter = {_id: ObjectId(id)}
        const result = await doctorsCollection.deleteOne(filter)
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