import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import authRouter from './apps/auth.js'
import profileRouter from './apps/profile.js'
import courseRouter from './apps/course.js'
import desireRouter from './apps/desire.js'
import MyCourseRouter from './apps/mycourse.js'
import assignmentRouter from './apps/assignment.js'
import authAdminRouter from './apps/authadmin.js'
import adminRouter from './apps/admin.js'
import addCourseRouter from './apps/addcoursebyadmin.js'
import testRouter from './apps/test.js'
import learnRouter from './apps/learn.js'
import session from 'express-session'
import cookieSession from 'cookie-session'
import { validateTokenMiddleware } from './middlewares/protect.js'
import cookieParser from 'cookie-parser'
import test2Router from './apps/test2.js'
import dotenv from 'dotenv'

dotenv.config()

async function init() {
  const app = express()
  const port = process.env.PORT || 4000

  app.use(cors())
  app.use(bodyParser.json())
  app.use(cookieParser())
  // app.set("trust proxy", 1); // trust first proxy
  // app.use(
  //   session({
  //     secret: "keyboard cat",
  //     resave: false,
  //     saveUninitialized: true,
  //     cookie: { secure: true },
  //   })
  // );
  app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 } }))
  // app.use(
  //   cookieSession({
  //     name: "session",
  //     keys: ["mySecretKey"],
  //     maxAge: 24 * 60 * 60 * 1000, // 24 hours
  //   })
  // );

  app.use('/auth', authRouter)
  app.use('/authadmin', authAdminRouter)
  app.use('/profile', profileRouter)
  app.use('/ourcourse', courseRouter)
  app.use('/coursedetail', courseRouter)
  app.use('/desire', desireRouter)
  app.use('/mycourse', MyCourseRouter)
  app.use('/assignment', assignmentRouter)
  app.use('/learn', learnRouter)
  app.use('/test', testRouter)
  app.use('/test2', test2Router)
  // app.use('/admin', adminRouter)
  app.use('/admin', addCourseRouter)

  app.get('/', function (req, res) {
    // Cookies that have not been signed
    console.log('Cookies: ', req.cookies)

    // Cookies that have been signed
    console.log('Signed Cookies: ', req.signedCookies)
  })

  //   app.use("/posts", postRouter);

  app.get('/', (req, res) => {
    res.send('Hello World!')
  })

  app.get('*', (req, res) => {
    res.status(404).send('Not found')
  })

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
  })
}

init()
