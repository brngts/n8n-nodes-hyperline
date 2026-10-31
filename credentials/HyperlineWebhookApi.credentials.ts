import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Only used by the Hyperline Trigger to check that a delivery really comes from
 * Hyperline. It never makes a request, so it has nothing to authenticate or test.
 */
export class HyperlineWebhookApi implements ICredentialType {
	name = 'hyperlineWebhookApi';

	displayName = 'Hyperline Webhook API';

	icon: Icon = { light: 'file:../icons/hyperline.svg', dark: 'file:../icons/hyperline.dark.svg' };

	documentationUrl = 'https://docs.hyperline.co/developers/webhooks';

	properties: INodeProperties[] = [
		{
			displayName: 'Signing Secret',
			name: 'signingSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Copy it from the webhook endpoint you created in Hyperline. It usually starts with "whsec_". Hyperline signs every delivery with it.',
		},
	];
}
