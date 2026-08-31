ENT.Type = "anim"
ENT.Base = "base_entity"
ENT.Author = ""
ENT.Information = ""
ENT.Spawnable = false
ENT.AdminSpawnable = false

ENT.PrintName  = "Signal flare"
ENT.Model = "models/weapons/arc9/darsu_eft/40x46_m381.mdl"
ENT.FuseTime = 20
ENT.ArmTime = 0

AddCSLuaFile()


function ENT:Initialize()
    if SERVER then
        self:SetModel( self.Model )
        self:SetMoveType( MOVETYPE_VPHYSICS )
        self:SetSolid( SOLID_VPHYSICS )
        self:PhysicsInit( SOLID_VPHYSICS )
        self:DrawShadow( true )

        local phys = self:GetPhysicsObject()
        if phys:IsValid() then
            phys:Wake()
            phys:SetBuoyancyRatio(0)
            -- phys:EnableDrag(true)
            -- phys:SetDragCoefficient(5)
            -- phys:SetMass(5)
        end

        self:SetCollisionGroup(COLLISION_GROUP_PROJECTILE)
    end

    table.insert(ARC9EFT.Flarelist, self)

    self.kt = CurTime() + self.FuseTime
    self.at = CurTime() + self.ArmTime
end

function ENT:PhysicsCollide(data, physobj)
    --if self.Collided then return end
    if IsValid(data.HitEntity) and data.Speed > 25 then
        --self.Collided = true
        local delta = math.Clamp((self.kt - CurTime()) / self.FuseTime, 0.1, 1)
        if delta <= 0.1 then return end
        if data.HitEntity:IsPlayer() then
            data.HitEntity:Ignite( delta * 5 )
        else
            data.HitEntity:Ignite( delta * 15 )
        end
    elseif data.HitEntity == Entity(0) and data.TheirSurfaceProps == 76 then -- sky hit
        -- physobj:EnableMotion(false)
        physobj:SetDragCoefficient(100)
        -- physobj:SetVelocity(Vector())
    end
end

function ENT:Think()
    if SERVER then
        if CurTime() >= self.kt then
            self:Remove()
        end
    end
end

function ENT:Detonate()
    self:Remove()
end

local flaremat = Material("effects/arc9_lensflare", "mips smooth")

ENT.FlareColor = Color(30, 255, 30)

function ENT:Draw()
    local delta = math.Clamp((self.kt - CurTime()) / self.FuseTime, 0.1, 1)
    local minsize = 750 * delta
    local maxsize = 1500 * delta
    local light = DynamicLight(self:EntIndex())

    local pos = self:GetPos()

    local colorr = table.Copy(self.FlareColor)
    colorr.r = colorr.r * delta
    colorr.g = colorr.g * delta
    colorr.b = colorr.b * delta
    
    if light then
        light.Pos = pos
        light.r = colorr.r
        light.g = colorr.g
        light.b = colorr.b
        light.Brightness = 4
        light.Decay = 3
        light.Size = 512 * delta
        light.DieTime = CurTime() + 0.2
    end


    render.SetMaterial( Material("entities/eft_sp81_attachments/flare") )
    render.DrawSprite( self:GetPos(), math.random(minsize, maxsize), math.random(minsize, maxsize), colorr ) -- Draw the sprite in the middle of the map, at 16x16 in it's original colour with full alpha.


    local diff = EyePos() - pos

    local tr = util.QuickTrace(pos, diff, {LocalPlayer(), LocalPlayer():GetViewEntity(), self})

    if tr.Fraction == 1 then
        local s = math.Clamp(1 - diff:Length() / 20000, 0.5, 1) ^ 1 * 60 * math.Rand(0.95, 1.05)
        s = ScreenScale(s)
        local toscreen = pos:ToScreen()
        cam.Start2D()
            surface.SetMaterial(flaremat)
            surface.SetDrawColor(colorr, 128)
            surface.DrawTexturedRect(toscreen.x - s / 2, toscreen.y - s / 2, s, s)
        cam.End2D()
    end
end

function ENT:DrawTranslucent(flags) -- doesn't draw wtf? or this is something with my addons
    self:Draw(flags)    -- fix from wiki anyway
end


ARC9EFT.Flarelist = {}

hook.Add("PostDrawTranslucentRenderables", "ARC9_EFT_FlareDraw", function() -- hack to make flares draw if they not on screen
    local slist = ARC9EFT.Flarelist

    if #slist > 0 then
        for k, v in ipairs(slist) do
            if IsValid(v) then
                v:Draw()
            else
                table.remove(slist, k)
            end
        end
    end
end)