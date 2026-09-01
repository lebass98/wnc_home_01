import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth, signToken } from '../lib/auth.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })

    // 계정 존재 여부를 노출하지 않도록 동일한 메시지를 사용한다.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }

    const role = user.role as 'ADMIN' | 'EDITOR'
    res.json({
      token: signToken({ sub: user.id, email: user.email, role }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        createdAt: user.createdAt.toISOString(),
      },
    })
  }),
)

/** 저장된 토큰이 아직 유효한지 확인하고 최신 사용자 정보를 반환한다. */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } })
    if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' })
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    })
  }),
)
