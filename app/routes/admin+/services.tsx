import {Button, Modal, TextInput, Textarea} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {DataFunctionArgs, MetaFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useFetcher, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {toast} from 'sonner'
import {prisma} from '~/lib/db.server'
import {badRequest} from '~/utils/misc.server'

export const meta: MetaFunction = () => {
	return [
		{
			title: 'Artify | Services',
		},
	]
}

export async function loader() {
	const services = await prisma.categories.findMany({})

	return json({
		services: services,
	})
}

type ActionData = {
	success: boolean
	fieldErrors?: {
		name?: string
		description?: string
	}
}
export const action = async ({request}: DataFunctionArgs) => {
	const formData = await request.formData()

	const name = formData.get('name')?.toString()
	const description = formData.get('description')?.toString()

	if (!name) {
		return badRequest({
			success: false,
			fieldErrors: {
				name: 'Name is required',
			},
		})
	}

	if (!description) {
		return badRequest({
			success: false,
			fieldErrors: {
				description: 'Description is required',
			},
		})
	}

	await prisma.categories.create({
		data: {
			name: name,
			description: description,
			image:
				'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1icnVzaCI+PHBhdGggZD0ibTkuMDYgMTEuOSA4LjA3LTguMDZhMi44NSAyLjg1IDAgMSAxIDQuMDMgNC4wM2wtOC4wNiA4LjA4Ii8+PHBhdGggZD0iTTcuMDcgMTQuOTRjLTEuNjYgMC0zIDEuMzUtMyAzLjAyIDAgMS4zMy0yLjUgMS41Mi0yIDIuMDIgMS4wOCAxLjEgMi40OSAyLjAyIDQgMi4wMiAyLjIgMCA0LTEuOCA0LTQuMDRhMy4wMSAzLjAxIDAgMCAwLTMtMy4wMnoiLz48L3N2Zz4=',
		},
	})

	return json({success: true})
}
export default function ServicesPage() {
	const {services} = useLoaderData<typeof loader>()
	const [isModalOpen, handleModal] = useDisclosure()

	const fetcher = useFetcher<ActionData>()
	const isSubmitting = fetcher.state !== 'idle'
	React.useEffect(() => {
		if (isSubmitting) return
		if (!fetcher.data) return

		if (fetcher.data.success) {
			toast.success('Service added successfully')
			handleModal.close()
		} else {
			toast.error('Failed to add service')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isSubmitting, fetcher.data])

	return (
		<>
			<div className="flex-1 bg-black py-24 sm:p-16">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-2xl lg:text-center">
						<div className="flex flex-col items-center justify-center gap-6">
							<h2 className="text-4xl font-semibold leading-7 text-red-600">
								Services
							</h2>

							<Button color="red" onClick={handleModal.open}>
								Add Service
							</Button>
						</div>
					</div>
					<div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
						<dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
							{services.map(service => (
								<div
									key={service.name}
									className="flex flex-col rounded-lg bg-gray-950 ring-1 ring-gray-800 hover:scale-105 hover:shadow-md hover:shadow-white"
								>
									<dt className="flex items-center justify-center gap-x-2 p-4 text-xl font-semibold leading-7 text-white">
										<div className="h-5 w-5 flex-none">
											<img src={service.image} alt="" />
										</div>
										{service.name}
									</dt>
									<dd className="mt-1 flex flex-auto flex-col items-center justify-center p-6 text-lg leading-7 text-gray-400">
										<p className="flex-auto">{service.description}</p>
									</dd>
								</div>
							))}
						</dl>
					</div>
				</div>
			</div>

			<Modal
				size="lg"
				opened={isModalOpen}
				onClose={handleModal.close}
				title="Add Service"
			>
				<fetcher.Form method="post" className="flex flex-col gap-4">
					<TextInput
						name="name"
						label="Name"
						error={fetcher.data?.fieldErrors?.name}
						required
					/>

					<Textarea
						name="description"
						label="Description"
						error={fetcher.data?.fieldErrors?.description}
						required
					/>

					<Button type="submit" color="green">
						Create
					</Button>
				</fetcher.Form>
			</Modal>
		</>
	)
}
