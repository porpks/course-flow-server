import { Router } from 'express'
import supabase from '../utils/db.js'

const authAdminRouter = Router()

authAdminRouter.post('/login', async (req, res) => {
  const loginData = {
    email: req.body.email,
    password: req.body.password,
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    })

    if (error) {
      return res.status(401).json({ error: error })
    }

    if (data) {
      const token = data.session.access_token
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', loginData.email)

        const adminId = data
        if (error) {
          return res.status(500).json({ error: 'Supabase query failed' })
        }
        return res.json({
          message: 'login succesfully',
          token,
          data: adminId,
        })
      } catch (error) {
        res.json({ error: error })
      }
    }
  } catch (error) {
    res.json({ error: error })
  }
})

export default authAdminRouter
