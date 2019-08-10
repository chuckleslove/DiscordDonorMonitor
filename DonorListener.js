const Discord=require('discord.js');
const ontime = require('ontime');
const bot=new Discord.Client();
const config = require('./DonorListenerConfig.json');


bot.on('ready', () => {
	CheckAllMembers();
});

ontime({cycle: '00:00'}, async function(ot) {
	console.log("Periodic check of all members");
	await CheckAllMembers();
	ot.done();
	return;
});

bot.on('guildMemberAdd', async (member) => {
	let guildID = member.guild.id;
	for(let i = 0; i < config.servers.length; i++)
	{
		if(config.servers[i].id == guildID)
		{
			let guild = bot.guilds.get(config.mainServer);			
			let donorMember = await guild.fetchMember(member.user.id).catch(error => {
				console.log("Could not locate member in main server");				
			});
			
			if(!donorMember)
			{
				return;				
			}
			if(donorMember.roles.has(config.mainDonorRole))
			{				
				let result = await AddDonorRoles(member);

				if(result) { return bot.channels.get(config.logChannel).send(result).catch(console.error); }
			}
		}
	}
});


bot.on('guildMemberUpdate', async (oldMember, newMember) => {	

	let hadRole = oldMember.roles.has(config.mainDonorRole);
	let hasRole = newMember.roles.has(config.mainDonorRole);

	if(hasRole && !hadRole)
	{
		console.log("User: "+newMember.displayName+"("+newMember.id+") has been given donor role in main server, about to add roles");
		let result = await AddDonorRoles(newMember);

		if(result) { return bot.channels.get(config.logChannel).send(result).catch(console.error); }
	}

	if(!hasRole && hadRole)
	{
		console.log("User: "+newMember.displayName+"("+newMember.id+") has lost donor role in main server, about to remove roles");
		let result = await RemoveDonorRoles(newMember);

		if(result) { return bot.channels.get(config.logChannel).send(result).catch(console.error); }
	}

	return;
});


async function CheckAllMembers()
{
	let guild = bot.guilds.get(config.mainServer);	

	await guild.fetchMembers();

	let count = 0;

	for(let [id,member] of guild.members)
	{
		if(member.roles.has(config.mainDonorRole))
		{
			console.log("Member: "+member.displayName+"("+id+") has donor role");
			let result = await AddDonorRoles(member);

			if(result) { bot.channels.get(config.logChannel).send(result).catch(console.error); }

		}
		else
		{
			console.log("Member: "+member.displayName+"("+id+") doesn't have donor role");
			let result = await RemoveDonorRoles(member);

			if(result) { bot.channels.get(config.logChannel).send(result).catch(console.error); }
		}

		count++;
	}

	console.log("Finished checking all members, total count: "+count);
	
}

async function AddDonorRoles(member)
{
	let embed = new Discord.RichEmbed().setTitle("Changes for User: "+member.displayName+"("+member.id+")");
	let changed = false;

	for(let i in config.servers)
	{
		let guild = bot.guilds.get(config.servers[i].id);
		let role = guild.roles.get(config.servers[i].role);

		if(!guild)
		{
			console.log("MISSING GUILD FROM BOT "+config.servers[i].id);
			return "MISSING GUILD FROM BOT "+config.servers[i].id;
		}
		if(!role)
		{
			console.log("MISSING ROLE FROM CONFIG "+config.servers[i].role);
			return "MISSING ROLE FROM CONFIG "+config.servers[i].role;
		}

		await guild.fetchMembers();

		let guildMember = guild.members.get(member.id);

		if(guildMember)
		{
			
			console.log("User: "+member.displayName+"("+member.id+") found in server "+guild.name);

			if(guildMember.roles.has(role.id))
			{
				console.log("User: "+member.displayName+"("+member.id+") already has donor role in "+guild.name);
			}
			else
			{
				try { await guildMember.addRole(role);

				embed.addField(guild.name,"Added donor role",false);
				changed = true;
				} catch(err)
				{
					console.error(err);
				}

				console.log("User: "+member.displayName+"("+member.id+") given donor role in "+guild.name);
			}

		}
		else
		{
			console.log("User: "+member.displayName+"("+member.id+") not found in server "+guild.name);
		}
	}

	if(changed)
	{
		return embed;
	}

	return "";
	
}


async function RemoveDonorRoles(member)
{
	if(!config.autoRemoveDonorRoles)
	{
		console.log("Removing roles disabled, skipping removal of: "+member.displayName+"("+member.id+")");
		return "";
	}

	let embed = new Discord.RichEmbed().setTitle("Changes for User: "+member.displayName+"("+member.id+")");
	let changed = false;

	for(let i in config.servers)
	{
		let guild = bot.guilds.get(config.servers[i].id);
		let role = guild.roles.get(config.servers[i].role);

		if(!guild)
		{
			console.log("MISSING GUILD FROM BOT "+config.servers[i].id);
			return "MISSING GUILD FROM BOT "+config.servers[i].id;
		}
		if(!role)
		{
			console.log("MISSING ROLE FROM CONFIG "+config.servers[i].role);
			return "MISSING ROLE FROM CONFIG "+config.servers[i].role;
		}

		await guild.fetchMembers();
		
		let guildMember = guild.members.get(member.id);

		if(guildMember)
		{
			

			console.log("User: "+member.displayName+"("+member.id+") found in server "+guild.name);

			if(guildMember.roles.has(role.id))
			{

				console.log("User: "+member.displayName+"("+member.id+") has donor role in "+guild.name+" removing now.");
				try {
				await guildMember.removeRole(role);

				embed.addField(guild.name,"Removed donor role",false);
				changed = true;
				} catch(err)
				{
					console.error(err);
				}
			}
			else
			{
				console.log("User: "+member.displayName+"("+member.id+") didn't have donor role in "+guild.name);
			}

		}
		else
		{
			console.log("User: "+member.displayName+"("+member.id+") not found in server "+guild.name);
		}
	}

	if(changed)
	{
		return embed;
	}

	return "";
	
}

bot.login(config.token);