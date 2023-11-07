import { Router } from 'express'
import multer from 'multer'
import supabase from '../utils/db.js'
import { validateTokenMiddleware } from '../middlewares/protect.js'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

const profileRouter = Router()

const multerUpload = multer({})
const avatarUpload = multerUpload.fields([{ name: 'avatar', maxCount: 1 }])
// , validateTokenMiddleware
profileRouter.get('/:userId', async (req, res) => {
  const userId = req.params.userId
  try {
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        message: 'Invalid url.',
      })
    }
    // full_name, date_of_birth, edu_background, email, image_url
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
    if (error && userId !== null) {
      return res.status(500).json({
        message: 'An error occurred while fetching data.',
        error2: error.message,
      })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: 'User not found.',
      })
    }

    return res.json({
      message: 'User profile data retrieved successfully.',
      data: data[0],
    })
  } catch (error) {
    return res.status(500).json({
      error2: error.message,
    })
  }
})

profileRouter.get(
  '/image/:userId',
  validateTokenMiddleware,
  async (req, res) => {
    const userId = req.params.userId

    try {
      const { data, error } = await supabase
        .from('users')
        .select('image_url')
        .eq('user_id', userId)
      if (error) {
        console.error(error)
        return res.status(500).json({ message: 'Internal server error' })
      }

      const imageUrl = data[0].image_url

      res.json(imageUrl)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Internal server error' })
    }
  }
)

profileRouter.put(
  '/:userId',
  [avatarUpload, validateTokenMiddleware],
  async (req, res) => {
    const userId = req.params.userId

    if (
      !req.body.full_name ||
      !req.body.date_of_birth ||
      !req.body.edu_background ||
      !req.body.email
    ) {
      return res.status(400).json({
        message: 'Please enter all information.',
      })
    }

    const nameValidate = /^[a-zA-Z' -]+$/
    if (!nameValidate.test(req.body.full_name)) {
      return res.status(400).json({
        message: 'Invalid name',
      })
    }

    const emailValidate = /^[a-zA-Z0-9._-]+@[^.]+\.(com)$/
    if (!emailValidate.test(req.body.email)) {
      return res.status(400).json({
        message: 'invalid email',
      })
    }

    try {
      if (req.files.length > 0 || req.files.avatar) {
        const file = req.files.avatar[0]

        const fileImage = new Blob([file.buffer], { type: file.mimetype })
        console.log(fileImage)
        const fileName = file.originalname.replace(/ /g, '_')
        console.log(fileName)

        const { data: objects, error: err } = await supabase.storage
          .from('test-avatar')
          .list(`profile/${userId}`)

        if (err) {
          console.error('Error listing objects:', err.message)
        }

        for (const object of objects) {
          const { error: errorRemove } = await supabase.storage
            .from('test-avatar')
            .remove(`profile/${userId}/${[object.name]}`)
          if (errorRemove) {
            console.error('Error remove objects:', errorRemove.message)
          }
        }

        const { data, error } = await supabase.storage
          .from('test-avatar')
          .upload(`profile/${userId}/${uuidv4()}`, fileImage)

        if (error) {
          console.error(error)
        } else {
          console.log('File uploaded successfully:', data)
        }

        const path = data.path
        const imgUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/test-avatar/${path}`
        const now1 = new Date()
        const formattedDate1 =
          now1.toISOString().replace(/T/, ' ').replace(/\..+/, '') +
          '.682314+00'

        try {
          const { data, error } = await supabase
            .from('users')
            .update({
              full_name: req.body.full_name,
              date_of_birth: req.body.date_of_birth,
              edu_background: req.body.edu_background,
              email: req.body.email,
              image_url: imgUrl,
              updated_at: formattedDate1,
            })
            .eq('user_id', userId)
          if (error) {
            console.log(error)
          }
        } catch (error) {
          console.error(error)
        }
      } else {
        const now2 = new Date()
        const formattedDate2 =
          now2.toISOString().replace(/T/, ' ').replace(/\..+/, '') +
          '.682314+00'

        try {
          const { data, error } = await supabase
            .from('users')
            .update({
              full_name: req.body.full_name,
              date_of_birth: req.body.date_of_birth,
              edu_background: req.body.edu_background,
              email: req.body.email,
              updated_at: formattedDate2,
            })
            .eq('user_id', userId)

          if (error) {
            console.log(error)
          }
        } catch (error) {
          console.error(error)
        }
      }
    } catch (error) {
      console.log(error)
    }

    return res.json({
      message: 'You profile has been update',
    })
  }
)

profileRouter.put('/delete/:userId', async (req, res) => {
  const userId = req.params.userId
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        image_url: null,
      })
      .eq('user_id', userId)

    if (error) {
      console.log(error)
      res.status(500).json({ error: 'Failed to update image_url' })
    } else {
      res.status(200).json({ message: 'Image URL removed' })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default profileRouter
