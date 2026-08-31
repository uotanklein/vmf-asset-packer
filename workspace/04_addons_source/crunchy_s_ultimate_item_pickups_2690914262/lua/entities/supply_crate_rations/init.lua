if( SERVER ) then
	AddCSLuaFile("cl_init.lua")
	AddCSLuaFile("shared.lua")
	include( "shared.lua" )
	
	CVAR_LOOTPOOLMAX = CreateConVar( "crate_rations_lootpoolsizemax", 4, { FCVAR_SERVER_CAN_EXECUTE, FCVAR_REPLICATED, FCVAR_NOTIFY }, "Decides the maximum amount of loot per crate" )
	CVAR_LOOTPOOLMIN = CreateConVar( "crate_rations_lootpoolsizemin", 2, { FCVAR_SERVER_CAN_EXECUTE, FCVAR_REPLICATED, FCVAR_NOTIFY }, "Decides the minimum amount of loot per crate, where '-1' = 0" )
	CVAR_CRATEHEALTH = CreateConVar( "crate_rations_health", 25, { FCVAR_SERVER_CAN_EXECUTE, FCVAR_REPLICATED, FCVAR_NOTIFY }, "Decides the base health of a spawned crate" )

end
	
function ENT:SpawnFunction( ply, tr, class )
	if ( !tr.Hit ) then return end
	local pos = tr.HitPos + tr.HitNormal * 4
	local ent = ents.Create( class )
	ent:SetPos( pos )
	ent:Spawn()
	ent:Activate()
	return ent
end

function ENT:Initialize()
	self:SetModel( "models/crunchy/props/random_props/crate_ammo.mdl")
	self.Entity:SetSkin( 2 )
	self:PhysicsInit( SOLID_VPHYSICS )      -- Make us work with physics,
	self:SetMoveType( MOVETYPE_VPHYSICS )   -- after all, gmod is a physics
	self:SetSolid( SOLID_VPHYSICS )         -- Toolbox
	self:PrecacheGibs()
	
	local phys = self:GetPhysicsObject()
	if (phys:IsValid()) then
		phys:Wake()
	end
end
	
function ENT:Use( activator, caller )
	return
end

function ENT:Think()

end

function ENT:Destruct()
	
	local z = math.random(-100, 100)
	
	self:GibBreakClient(Vector(0, 0, z))
	
	self:EmitSound(Sound("crate_rations_break.wav"))
	
	math.random()
	local lootpool = math.random(CVAR_LOOTPOOLMIN:GetInt( ), CVAR_LOOTPOOLMAX:GetInt( ))
	
	for i = lootpool,1,-1 do 
		
		math.random()
		local loottype = math.random(1, 5)
		local loottype_name
		
		if (loottype == 1) then 
			loottype_name = "nmrih_food_protein"
		elseif (loottype == 2) then 
			loottype_name = "nmrih_food_pasta"
		elseif (loottype == 3) then 
			loottype_name = "nmrih_food_oatmeal"
		elseif (loottype == 4) then 
			loottype_name = "nmrih_food_candy"
		elseif (loottype == 5) then 
			loottype_name = "stalker_food_energydrink_water"
		end
		
		local ent = ents.Create( loottype_name )
		if ( !IsValid( ent ) ) 
			then 
			return
		end
		ent:SetPos( self:GetBonePosition( 1 ) + (Vector((-10 + math.random(-10, 10)), math.random(-10, 10), 0)))
		ent:Spawn()
		ent:SetCollisionGroup(COLLISION_GROUP_PASSABLE_DOOR)
	end
end

function ENT:OnTakeDamage(dmg)
	self.Damage = ( self.Damage or CVAR_CRATEHEALTH:GetInt( ) ) - dmg:GetDamage()
	if self.Damage <= 0 then
		self:Destruct()
		self:Remove()
	end
end