import {
  ActionIcon,
  Button,
  PasswordInput,
  Select,
  TextInput,
  Textarea,
} from "@mantine/core"
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react"
import { ArrowLeftIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import { createCustomer, getCustomerByEmail } from "~/models/customer.server"
import { createEditor, getEditorByEmail } from "~/models/editor.server"
import { UserRole } from "~/roles"
import * as React from "react"

import {
  createUserSession,
  getUserId,
  getUserRole,
  isAdmin,
  isCustomer,
  isEditor,
} from "~/session.server"
import { safeRedirect, validateEmail } from "~/utils/misc.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request)
  const userRole = await getUserRole(request)

  if (!userId || !userRole) {
    return null
  }

  if (await isAdmin(request)) {
    return redirect("/admin")
  } else if (await isCustomer(request)) {
    return redirect("/customer")
  } else if (await isEditor(request)) {
    return redirect("/editor")
  }

  return null
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Register",
    },
  ]
}

type ActionData = {
  errors?: {
    name?: string
    email?: string
    password?: string
    experience?: string
    portfolio?: string
    skills?: string
    awards?: string
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const searchParams = new URL(request.url).searchParams
  const redirectTo = searchParams.get("redirectTo")
  const formData = await request.formData()
  const role = formData.get("role")?.toString()
  const name = formData.get("name")?.toString()
  const email = formData.get("email")?.toString()
  const password = formData.get("password")?.toString()
  const experience = formData.get("experience")?.toString()
  const portfolio = formData.get("portfolio")?.toString()
  const skills = formData.get("skills")?.toString()
  const awards = formData.get("awards")?.toString()

  if (!role) {
    return json(
      {
        errors: {
          role: "Role is required",
          email: null,
          password: null,
        },
      },
      400
    )
  }
  if (!name) {
    return json(
      {
        errors: {
          name: "Name is required",
          email: null,
          password: null,
        },
      },
      400
    )
  }
  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid", password: null, name: null } },
      { status: 400 }
    )
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { email: null, password: "Password is required", name: null } },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return json(
      {
        errors: { email: null, password: "Password is too short", name: null },
      },
      { status: 400 }
    )
  }

  if (role === UserRole.CUSTOMER) {
    const existingCustomer = await getCustomerByEmail(email)
    if (existingCustomer) {
      return json(
        {
          errors: {
            email: "An user alreadys exists with this email",
            password: null,
            name: null,
          },
        },
        400
      )
    }

    const user = await createCustomer({ email, password, name })

    if (!user) {
      return json(
        {
          errors: {
            email: "An unknown error occurred",
            password: "An unknown error occurred",
            name: null,
          },
        },
        { status: 500 }
      )
    }

    return createUserSession({
      request,
      userId: user.id,
      role: role as UserRole,
      redirectTo: safeRedirect(redirectTo),
    })
  }

  if (!experience) {
    return json<ActionData>(
      {
        errors: {
          experience: "Experience is required",
        },
      },
      400
    )
  }

  if (!portfolio) {
    return json<ActionData>(
      {
        errors: {
          portfolio: "Portfolio is required",
        },
      },
      400
    )
  }

  if (!skills) {
    return json<ActionData>(
      {
        errors: {
          skills: "Skills is required",
        },
      },
      400
    )
  }

  if (!awards) {
    return json<ActionData>(
      {
        errors: {
          awards: "Awards is required",
        },
      },
      400
    )
  }

  const existingEditor = await getEditorByEmail(email)
  if (existingEditor) {
    return json(
      {
        errors: {
          email: "An user already exists with this email",
          password: null,
          name: null,
        },
      },
      400
    )
  }

  const user = await createEditor({
    email,
    password,
    name,
    experience,
    portfolio,
    skills,
    awards,
  })

  if (!user) {
    return json(
      {
        errors: {
          email: "An unknown error occurred",
          password: "An unknown error occurred",
          name: null,
        },
      },
      { status: 500 }
    )
  }

  return createUserSession({
    request,
    userId: user.id,
    role: role as UserRole,
    redirectTo: safeRedirect(redirectTo),
  })
}

export default function Register() {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo")
  const actionData = useActionData<ActionData>()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [role, setRole] = React.useState(UserRole.CUSTOMER)

  useEffect(() => {
    if (actionData?.errors?.name) {
      nameRef.current?.focus()
    } else if (actionData?.errors?.email) {
      emailRef.current?.focus()
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus()
    }
  }, [actionData])

  return (
    <div className="relative isolate flex min-h-full flex-col justify-center">
      <div className="absolute inset-0 bg-black">
        <img
          src="/img/login-bg.png"
          alt="Login-bg"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative mb-4 flex items-center justify-center gap-3">
        <ActionIcon component={Link} to="/" color="white">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </ActionIcon>
        <span className="text-base text-white underline">Back to home</span>
      </div>
      <div className="relative mx-auto w-full max-w-md rounded-lg border-2 border-white p-6 px-8">
        <div className="flex items-center justify-center pb-4 text-3xl">
          <h3 className="text-gray-300">Register!</h3>
        </div>
        <Form method="post" className="space-y-6">
          <Select
            name="role"
            label="Role"
            placeholder="Select your role"
            value={role}
            onChange={(val) => setRole(val as UserRole)}
            data={Object.values(UserRole)
              .filter((role) => role !== UserRole.ADMIN)
              .map((role) => ({
                label: role,
                value: role,
              }))}
            className="text-gray-300"
            required
          />

          <TextInput
            ref={emailRef}
            id="name"
            autoFocus={true}
            name="name"
            label="Name"
            type="name"
            autoComplete="email"
            aria-invalid={actionData?.errors?.name ? true : undefined}
            aria-describedby="name-error"
            className="text-gray-300"
          />
          {actionData?.errors?.name ? (
            <div className="pt-1 text-red-700" id="name-error">
              {actionData.errors.name}
            </div>
          ) : null}

          <TextInput
            ref={emailRef}
            id="email"
            autoFocus={true}
            name="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            aria-invalid={actionData?.errors?.email ? true : undefined}
            aria-describedby="email-error"
            className="text-gray-300"
          />
          {actionData?.errors?.email ? (
            <div className="pt-1 text-red-700" id="email-error">
              {actionData.errors.email}
            </div>
          ) : null}

          <PasswordInput
            id="password"
            ref={passwordRef}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
            className="text-gray-300"
          />
          {actionData?.errors?.password ? (
            <div className="pt-1 text-red-700" id="password-error">
              {actionData.errors.password}
            </div>
          ) : null}

          {role === UserRole.EDITOR ? (
            <>
              <TextInput
                id="experience"
                name="experience"
                label="Experience"
                aria-invalid={actionData?.errors?.experience ? true : undefined}
                aria-describedby="experience-error"
                className="text-gray-300"
              />
              {actionData?.errors?.experience ? (
                <div className="pt-1 text-red-700" id="experience-error">
                  {actionData.errors.experience}
                </div>
              ) : null}

              <TextInput
                id="portfolio"
                name="portfolio"
                label="Portfolio"
                aria-invalid={actionData?.errors?.portfolio ? true : undefined}
                aria-describedby="portfolio-error"
                className="text-gray-300"
              />
              {actionData?.errors?.portfolio ? (
                <div className="pt-1 text-red-700" id="portfolio-error">
                  {actionData.errors.portfolio}
                </div>
              ) : null}

              <Textarea
                id="Skills"
                name="skills"
                label="Skills"
                aria-invalid={actionData?.errors?.skills ? true : undefined}
                aria-describedby="skills-error"
                className="text-gray-300"
              />
              {actionData?.errors?.skills ? (
                <div className="pt-1 text-red-700" id="skills-error">
                  {actionData.errors.skills}
                </div>
              ) : null}

              <Textarea
                id="awards"
                name="awards"
                label="Awards"
                aria-invalid={actionData?.errors?.awards ? true : undefined}
                aria-describedby="awards-error"
                className="text-gray-300"
              />
              {actionData?.errors?.awards ? (
                <div className="pt-1 text-red-700" id="awards-error">
                  {actionData.errors.awards}
                </div>
              ) : null}
            </>
          ) : null}

          <input
            type="hidden"
            name="redirectTo"
            defaultValue={redirectTo ?? ""}
          />

          <Button
            type="submit"
            fullWidth
            mt="1rem"
            variant="outline"
            color="white"
            className="hover:bg-black hover:text-white"
          >
            Sign up
          </Button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-300">
              Already have an account?{" "}
              <Link
                className="text-gray-300 underline hover:text-gray-500"
                to={{
                  pathname: "/login",
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}
