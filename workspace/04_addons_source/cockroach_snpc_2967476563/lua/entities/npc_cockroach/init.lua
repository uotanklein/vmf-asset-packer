AddCSLuaFile("cl_init.lua")
AddCSLuaFile("shared.lua")

include("shared.lua")

-- IF YOU WANT TO COPY MY CODE, COPY THE ONE FROM MY RAT NPC BECAUSE I THIS IS JUST A MODIFICATION OF THAT ONE

local idleTime = 0
local scale = 1
local pitch = 100
local selfModel = "models/smok/cockroach.mdl"


function ENT:Initialize()
    self:SetModel(selfModel)
    self:SetKeyValue("npc_template","npc_cockroach")
    self:SetHullType(HULL_TINY)
    self:SetHullSizeNormal()
    self:SetCollisionBounds(Vector(-3, -4, 0), Vector(3, 4, 3.37))
    self:SetSolid(SOLID_BBOX)
    self:SetMoveType(MOVETYPE_STEP)
    self:CapabilitiesAdd(CAP_MOVE_GROUND)
    self:SetMaxYawSpeed(5000)
    self:SetHealth(5)
    self:SetModelScale(scale, 0)
    self.time = CurTime()
    self.timeRuning = CurTime()
    self.followTime = CurTime()
    self.petTime = CurTime()
    self.sniffTime = 0
    self.startEatTime = false 
    self.eatTime = nil
    self.isPanicked = false
    self.isFriendly = false
    self.foundCorpse = false
    self.igonreRatCorpses = false

    self.ignoreCorpses = {}
    self.petAmount = 0
    
    
end


function ENT:Think()

    
    if GetConVar("ai_disabled"):GetBool() == true then 
        
        return
    end
    if not self.isPanicked then
        local corpses = ents.FindInSphere(self:GetPos(), 200) 
        
        for i, ent in pairs(corpses) do

            if ent:GetClass() == "prop_ragdoll" then

                if (ent:GetModel() == selfModel)  then
                    
                    continue
                end

                if table.HasValue(self.ignoreCorpses, corpses[i]) then

                    continue
                end
                
                local corpsePos = ent:GetPos()
                local ratPos = self:GetPos()
                local dir = ratPos - corpsePos
                local distance = dir:Length()

                self:SetLastPosition(ratPos - (dir - dir:GetNormalized()*40))
                self:SetSchedule(SCHED_FORCED_GO_RUN)
                
                if distance < 30 and CurTime() - self.sniffTime > 4 then 

                    
                    self.sniffTime = CurTime()

                    if not self.startEatTime then
                        self.eatTime = CurTime() + 20
                        self.startEatTime = true
                    end 


                end
                if self.startEatTime and self.eatTime <= CurTime() then
                    table.insert(self.ignoreCorpses, corpses[i])
                    self.eatTime = nil
                    self.startEatTime = false
                    
                    
                end
                break
            end
            
        end
    end
    if not self.isFriendly then
        local players = ents.FindInSphere(self:GetPos(), 100) 
        for _, ent in pairs(players) do
            if self.isPanicked then
                if CurTime() - self.timeRuning > 5 then
                    self.isPanicked = false 
                end
                
                
                if self:GetCurrentSchedule() != SCHED_RUN_RANDOM then
                    
                    self:SetSchedule(SCHED_RUN_RANDOM)
                    idleTime = 0
                end
            end 
            if ent:IsPlayer() and CurTime() - self.timeRuning > 3 then 
                
                self:ClearSchedule()
                local ratPos = self:GetPos()
                local playerPos = ent:GetPos()
                local dir = ratPos - playerPos
                local distance = dir:Length()
                local awayPos = ratPos + dir:GetNormalized() * (distance + 100) 
                self:SetLastPosition(awayPos)
                self:SetSchedule(SCHED_FORCED_GO_RUN) 
                self.timeRuning = CurTime()
                idleTime = 0
                return

            end
            if not self:IsMoving() and ent:IsPlayer() then
                
                timer.Simple(1, function() idleTime = idleTime + 1 end)
                if idleTime >= 1 then 
                    self.isPanicked = true
                    self:EmitSound("cockroach/cockroach_panic_01.wav", 50, pitch)
                end
            end

        end
        if self.isFriendly then

            
        end
    else 
        
        local ply = self.plyToFollow 
        --if ply and IsValid(ply) then
            local plyPos = ply:GetPos()
            local ratPos = self:GetPos()
            local dist = ratPos:Distance(plyPos)
            if dist > 200 and CurTime() -  self.followTime > 2 then -- if the player is far enough away, move towards their position
                self:SetLastPosition(plyPos)
                self:SetActivity( ACT_RUN )
                self:SetSchedule(SCHED_FORCED_GO_RUN)
                self.followTime = CurTime()
            else 
                if self:GetPos():Distance(plyPos) < 30 then
                    self:SetSchedule(SCHED_IDLE_STAND)
                end
            end
        --end
    end

    if self.petAmount and self.petAmount > 5 then
        -- Will add something here soon
    end

end

function ENT:EatCorpse()

end

function ENT:Touch(ent)
    if ent:IsVehicle() or ent:IsPlayer() or (ent:IsNPC() and ent:GetClass() ~= "npc_cockroach") then
        self:TakeDamage(20)
    end
    
end

function ENT:SelectSchedule()
    self:SetActivity( ACT_RUN )
    self:SetSchedule(SCHED_RUN_RANDOM)
    local randomNum = math.random(0,3)
    if randomNum == 3 then 
        --self:EmitSound(idleSounds[math.random(1,2)], 70, pitch)
    end

    if not self:IsMoving() and CurTime() - self.time > 6 then
        self:ClearSchedule()
        
        self:SetSchedule(SCHED_IDLE_STAND)
        --print("RAT IS IDLE")
        self.time = CurTime()

    end
    

end

function ENT:AcceptInput(inputName, activator, called, data)
    
    if inputName == "kill" then 
        return true 
    end

    if  inputName == "Use" and IsValid(activator) and activator:IsPlayer() then
        
        if CurTime() - self.petTime > 0.5 then 
        self:EmitSound("physics/body/body_medium_impact_soft" ..math.random(3,7) .. ".wav", 100, math.random(90,110))
        self.isFriendly = true
        self.plyToFollow = activator
        self.petTime = CurTime()
        self.petAmount = self.petAmount + 1
        end

    end
end
-- function ENT:PlayPanicSound()
--     if not self.isPanicked then
--         self:EmitSound("rat/rat_panic_1.wav", 80, pitch)
--     end
-- end
function ENT:OnTakeDamage(dmginfo)
    

    --self:PlayPanicSound()
    self.isFriendly = false 
    self.isPanicked = true
    self.timeRuning = CurTime()
    
    
    local attacker = dmginfo:GetAttacker()
    local inflictor = dmginfo:GetInflictor()
    --print (attacker:GetActiveWeapon())
    --print (inflictor:GetClass())

    if(inflictor:GetClass() == "sent_nuke" or inflictor:GetClass() == "m9k_davy_crockett_explo" or inflictor:GetClass() == "tnuke_m9k_davy_crockett_explo") then  -- cockroaches don't care about nukes :)
        return    
    end
   

    self:SetHealth(self:Health() - dmginfo:GetDamage())
    if self:Health() <= 0 then
        self:OnDeath(dmginfo)
    end
    --print("CURRENT SCHEDULE IS ",self:GetCurrentSchedule())
    --print("CURRENT ACTIVITY IS ",self:GetActivity())
    local pos = self:GetPos() 
    ParticleEffect("blood_impact_green_01_droplets", pos, Angle(0, 0, 0), nil)
    
    local direction
    local startpos
    local weapon
    if IsValid(attacker) and (attacker:IsPlayer() or attacker:IsNPC())  then
        direction = attacker:GetAimVector()
        startpos = attacker:GetShootPos()
        weapon = attacker:GetActiveWeapon()
    else
        direction = -vector_up
        startpos = self:GetPos()
    end
    
    local endpos = startpos + direction * 300
    
    local tr = util.TraceLine({
        start = startpos,
        endpos = endpos,
        filter = function(ent)
            if ent == ply or ent == weapon  or ent == self then
                return false 
            end
            return false
        end 
        
    })

    util.Decal("YellowBlood" , tr.HitPos + tr.HitNormal , tr.HitPos - tr.HitNormal)


end



function ENT:OnDeath(damageInfo)
    self:SetModelScale(scale, 0)
    self:SetSolid(SOLID_NONE)
    self:SetMoveType(MOVETYPE_NONE)
    self:SetNoDraw(true)
    self:SetNotSolid(true)
    self:SetCollisionGroup(COLLISION_GROUP_DEBRIS)
    self:EmitSound("cockroach/cockroach_death_0"..math.random(1,3)..".wav", 80, pitch)
    self:StopSound("cockroach/cockroach_panic_01.wav")
    local ragdoll = ents.Create("prop_ragdoll")
    ragdoll:SetModel(selfModel)
    ragdoll:SetPos(self:GetPos() + Vector(0, 0, 2))
    ragdoll:SetAngles(self:GetAngles())
    ragdoll:Spawn()
    ragdoll:Activate()
    ragdoll:SetCollisionGroup(COLLISION_GROUP_DEBRIS)
    ragdoll:SetVelocity(self:GetVelocity())
    
    if damageInfo then
        local direction = damageInfo:GetDamageForce():GetNormalized()
        local force = direction * damageInfo:GetDamage() * 100
        ragdoll:GetPhysicsObject():ApplyForceCenter(force)
    end
    timer.Simple(50, function() if IsValid(ragdoll) then ragdoll:Remove() end end)
    
    self:Remove()
end







