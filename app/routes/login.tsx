import {
  ActionIcon,
  Button,
  Group,
  PasswordInput,
  SegmentedControl,
  Switch,
  TextInput,
} from "@mantine/core"
import {
  redirect,
  type ActionFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node"
import { Link, useFetcher, useSearchParams } from "@remix-run/react"
import { ArrowLeftIcon } from "lucide-react"
import { z } from "zod"
import { verifyAdminLogin } from "~/models/admin.server"
import { verifyCustomerLogin } from "~/models/customer.server"
import { verifyEditorLogin } from "~/models/editor.server"
import { UserRole } from "~/roles"
import {
  createUserSession,
  getUserId,
  getUserRole,
  isAdmin,
  isCustomer,
  isEditor,
} from "~/session.server"
import { badRequest, safeRedirect } from "~/utils/misc.server"
import { validateAction, type inferErrors } from "~/utils/validation"

const userRoleRedirect = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.CUSTOMER]: "/customer",
  [UserRole.EDITOR]: "/editor",
} satisfies Record<UserRole, string>

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.enum(["on"]).optional(),
  role: z.nativeEnum(UserRole),
})
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  const userRole = await getUserRole(request)

  if (!userId || !userRole) {
    return null
  }

  if (await isAdmin(request)) {
    return redirect("/admin")
  }

  if (await isCustomer(request)) {
    return redirect("/customer")
  }

  if (await isEditor(request)) {
    return redirect("/editor")
  }

  return null
}

interface ActionData {
  fieldErrors?: inferErrors<typeof LoginSchema>
}

export const action: ActionFunction = async ({ request }) => {
  const searchParams = new URL(request.url).searchParams
  const redirectTo = searchParams.get("redirectTo")

  const { fieldErrors, fields } = await validateAction(request, LoginSchema)

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors })
  }

  const { email, password, remember, role } = fields
  let user
  if (role === UserRole.ADMIN) {
    user = await verifyAdminLogin({ email, password })
  } else if (role === UserRole.CUSTOMER) {
    user = await verifyCustomerLogin({ email, password })
  } else if (role === UserRole.EDITOR) {
    user = await verifyEditorLogin({ email, password })
  }

  if (!user) {
    return badRequest<ActionData>({
      fieldErrors: {
        password: "Invalid Email or Password",
      },
    })
  }

  return createUserSession({
    request,
    userId: user.id,
    role: fields.role,
    remember: remember === "on" ? true : false,
    redirectTo: safeRedirect(redirectTo || userRoleRedirect[role]),
  })
}

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Login",
    },
  ]
}
export default function Login() {
  const [searchParams] = useSearchParams()

  const fetcher = useFetcher<ActionData>()
  const actionData = fetcher.data

  const redirectTo = searchParams.get("redirectTo")
  console.log("searchParams redirectTo", redirectTo)

  const isSubmitting = fetcher.state !== "idle"

  return (
    <>
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
            <h3 className="text-gray-300">Welcome to Artify!</h3>
          </div>
          <fetcher.Form method="post" className="mt-8">
            <input
              type="hidden"
              name="redirectTo"
              defaultValue={redirectTo ?? ""}
            />
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <SegmentedControl
                name="role"
                title="Role"
                data={Object.values(UserRole).map((role) => ({
                  label: role,
                  value: role,
                }))}
                color="black"
              />
              <TextInput
                name="email"
                type="email"
                autoComplete="email"
                label="Email address"
                error={actionData?.fieldErrors?.email}
                className="text-gray-300"
                required
              />
              <PasswordInput
                name="password"
                label="Password"
                error={actionData?.fieldErrors?.password}
                autoComplete="current-password"
                className="text-gray-300"
                required
              />
              <Group mt="1rem">
                <Switch
                  id="remember-me"
                  name="rememberMe"
                  label="Remember me"
                  color="gray"
                  className="text-white"
                />
                <div className="text-center text-sm text-gray-300">
                  Don't have an account?{" "}
                  <Link
                    className="text-gray-300 underline hover:text-gray-500"
                    to={{
                      pathname: "/register",
                      search: searchParams.toString(),
                    }}
                  >
                    Sign up
                  </Link>
                </div>
              </Group>
              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                mt="1rem"
                variant="outline"
                color="white"
                className="hover:bg-black hover:text-white"
              >
                Sign in
              </Button>
            </fieldset>
          </fetcher.Form>
        </div>
      </div>
    </>
  )
}
